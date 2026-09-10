import httpx
import logging
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime
from shapely.geometry import shape, box

from app.schemas.monitoring import MonitoringZone, NewSceneEvent, SceneDiscoveryCheckpoint
from app.core.config import settings

logger = logging.getLogger(__name__)


class CDSEDiscoveryService:
    def __init__(self, odata_url: str = settings.CDSE_ODATA_CATALOG_URL):
        self.odata_url = odata_url
        
    async def reconcile(
        self, 
        checkpoint: SceneDiscoveryCheckpoint, 
        zone: MonitoringZone
    ) -> Tuple[List[NewSceneEvent], SceneDiscoveryCheckpoint]:
        """
        Query OData for newly published Sentinel-1 GRD products, filter spatially, 
        deduplicate by stable CDSE product UUID, and emit NewSceneEvents.
        """
        # Safety net: query OData catalog with PublicationDate > last_checkpoint
        # Format the datetime for OData (ISO 8601 with Z)
        last_pub_str = checkpoint.last_publication_date.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        
        # Build OData filter
        # e.g. Collection/Name eq 'SENTINEL-1' and contains(Name,'IW_GRDH') and PublicationDate gt 2024-01-01T00:00:00.000Z
        collection = "SENTINEL-1"
        product_type = "IW_GRDH"  # Defaulting to IW_GRDH for Phase 16A feasibility
        
        filter_str = (
            f"Collection/Name eq '{collection}' and "
            f"contains(Name,'{product_type}') and "
            f"PublicationDate gt {last_pub_str}"
        )
        
        # Spatial filtering: restrict OData query directly to monitoring zone AOI
        if zone.bbox:
            min_lon, min_lat, max_lon, max_lat = zone.bbox
            poly = f"POLYGON(({min_lon} {min_lat}, {max_lon} {min_lat}, {max_lon} {max_lat}, {min_lon} {max_lat}, {min_lon} {min_lat}))"
            filter_str += f" and OData.CSC.Intersects(area=geography'SRID=4326;{poly}')"
        
        query_url = f"{self.odata_url}/Products"
        params: Dict[str, str | int] = {
            "$filter": filter_str,
            "$orderby": "PublicationDate asc",
            "$expand": "Attributes",
            "$top": 100
        }
        
        events = []
        new_known_ids = set(checkpoint.known_product_ids)
        latest_pub_date = checkpoint.last_publication_date
        
        try:
            async with httpx.AsyncClient() as client:
                # OData Products endpoint does not require auth for read-only catalog queries
                response = await client.get(query_url, params=params, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                products = data.get("value", [])
                
                for prod in products:
                    product_id = prod.get("Id")
                    
                    if not product_id:
                        continue
                        
                    # Deduplicate by stable CDSE product UUID
                    if product_id in new_known_ids:
                        continue
                        
                    # Parse publication date to update checkpoint
                    pub_str = prod.get("PublicationDate")
                    if pub_str:
                        # CDSE uses formats like "2024-05-27T10:00:00.000Z"
                        try:
                            # Handle potential fractional seconds
                            pub_str = pub_str.replace("Z", "+00:00")
                            pub_date = datetime.fromisoformat(pub_str).replace(tzinfo=None)
                            if pub_date > latest_pub_date:
                                latest_pub_date = pub_date
                        except ValueError:
                            pass
                    
                    new_known_ids.add(product_id)
                    
                    # Client-side spatial filter against monitoring zone AOI
                    if not self._check_spatial_overlap(prod, zone):
                        continue
                        
                    event = self._parse_odata_product(prod, zone, "CDSE_RECONCILIATION")
                    if event:
                        events.append(event)
                        
        except Exception as e:
            logger.error(f"Error during CDSE OData reconciliation: {str(e)}")
            # Return current checkpoint if we fail, so we try again next time
            return [], checkpoint
            
        # Update checkpoint
        # Keep only the last 1000 known IDs to prevent unbounded growth
        new_checkpoint = SceneDiscoveryCheckpoint(
            last_publication_date=latest_pub_date,
            known_product_ids=list(new_known_ids)[-1000:]
        )
        
        return events, new_checkpoint

    def process_subscription_notification(self, notification: Dict[str, Any], zone: MonitoringZone) -> Optional[NewSceneEvent]:
        """
        Process a notification from a CDSE PULL subscription.
        Applies client-side spatial filtering and converts to NewSceneEvent.
        """
        # A full notification from PULL subscription typically has a 'value' dict containing the product metadata
        product_metadata = notification.get("value")
        if not product_metadata:
            # If it's a 3-day old notification, the 'value' is stripped
            return None
            
        if not self._check_spatial_overlap(product_metadata, zone):
            return None
            
        return self._parse_odata_product(product_metadata, zone, "CDSE_SUBSCRIPTION")

    def _check_spatial_overlap(self, product_metadata: Dict[str, Any], zone: MonitoringZone) -> bool:
        """Test product footprint against monitoring zone AOI"""
        geo_footprint = product_metadata.get("GeoFootprint")
        if not geo_footprint:
            return False
            
        try:
            product_shape = shape(geo_footprint)
            
            # Use zone geometry if available, otherwise fallback to bbox
            if zone.geometry:
                zone_shape = shape(zone.geometry)
            else:
                min_lon, min_lat, max_lon, max_lat = zone.bbox
                zone_shape = box(min_lon, min_lat, max_lon, max_lat)
                
            return product_shape.intersects(zone_shape)
        except Exception as e:
            logger.error(f"Error computing spatial overlap: {str(e)}")
            return False

    def _parse_odata_product(
        self, 
        product_metadata: Dict[str, Any], 
        zone: MonitoringZone, 
        discovery_source: str
    ) -> Optional[NewSceneEvent]:
        """Normalize OData product to NewSceneEvent"""
        try:
            # CDSE OData representation extraction
            product_id = product_metadata.get("Id")
            product_name = product_metadata.get("Name")
            
            if not product_id or not product_name:
                return None
                
            # ContentDate has Start and End (Acquisition time)
            content_date = product_metadata.get("ContentDate", {})
            acq_time_str = content_date.get("Start", product_metadata.get("OriginDate"))
            pub_time_str = product_metadata.get("PublicationDate")
            
            acq_time = datetime.fromisoformat(acq_time_str.replace("Z", "+00:00")).replace(tzinfo=None) if acq_time_str else datetime.utcnow()
            pub_time = datetime.fromisoformat(pub_time_str.replace("Z", "+00:00")).replace(tzinfo=None) if pub_time_str else datetime.utcnow()
            
            geo_footprint = product_metadata.get("GeoFootprint")
            
            # Calculate bbox from footprint
            product_shape = shape(geo_footprint)
            bounds = product_shape.bounds # (minx, miny, maxx, maxy)
            
            # Extract additional properties from Attributes if available
            platform = "SENTINEL-1"
            orbit_direction = None
            polarization = None
            instrument_mode = None
            
            attributes = product_metadata.get("Attributes", [])
            for attr in attributes:
                name = attr.get("Name")
                value = attr.get("Value")
                if name == "orbitDirection":
                    orbit_direction = value
                elif name == "polarisationChannels":
                    polarization = value
                elif name == "instrumentMode":
                    instrument_mode = value
            
            return NewSceneEvent(
                product_id=product_id,
                product_name=product_name,
                collection="sentinel-1-grd",
                acquisition_time=acq_time,
                publication_time=pub_time,
                geometry=geo_footprint or {},
                bbox=bounds,
                monitoring_zone_id=zone.id,
                owner_uid=zone.owner_uid,
                discovery_source=discovery_source,
                platform=platform,
                orbit_direction=orbit_direction,
                polarization=polarization,
                instrument_mode=instrument_mode
            )
        except Exception as e:
            logger.error(f"Failed to parse OData product to NewSceneEvent: {str(e)}")
            return None
