import httpx
import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime

from app.schemas.ais import (
    VesselIdentity, 
    GFWPresenceRecord, 
    GFWEvent, 
    GFWAISProvenance
)
from app.services.ais_service import AISProvider
from app.core.config import settings

logger = logging.getLogger(__name__)


class GFWAISProvider(AISProvider):
    """
    Global Fishing Watch AIS Provider.
    
    IMPORTANT: GFW does NOT provide raw, high-frequency AIS tracks. 
    It provides AIS-derived aggregated vessel presence (~1 position per hour) 
    and vessel events (gaps, encounters, port visits).
    
    This provider implements the AISProvider interface structurally, but 
    raises NotImplementedError for high-frequency track retrieval to maintain 
    scientific honesty.
    """
    def __init__(self, token: str = settings.GFW_API_TOKEN):
        self.token = token
        self.base_url = "https://gateway.api.globalfishingwatch.org/v3"
        self.dataset = "public-global-presence:latest"
        
    async def fetch_raw_positions(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float,
                                  start_time: datetime, end_time: datetime) -> List[Any]:
        """
        DO NOT USE. GFW does not provide raw AIS tracks.
        Use search_vessel_presence() instead for candidate filtering.
        """
        raise NotImplementedError(
            "GFW does not provide raw high-frequency AIS tracks. "
            "Use search_vessel_presence() for presence-based candidate filtering."
        )

    async def get_vessel_identities(self, mmsis: List[str]) -> List[VesselIdentity]:
        """
        Resolve MMSIs to GFW vessel identities.
        """
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        identities = []
        headers = {"Authorization": f"Bearer {self.token}"}
        
        async with httpx.AsyncClient() as client:
            for mmsi in mmsis:
                try:
                    # GFW Search API requires querying by MMSI
                    # Example query: /vessels/search?query=mmsi:123456789
                    search_url = f"{self.base_url}/vessels/search"
                    params = {"query": f"mmsi:{mmsi}"}
                    
                    resp = await client.get(search_url, headers=headers, params=params, timeout=10.0)
                    resp.raise_for_status()
                    data = resp.json()
                    
                    entries = data.get("entries", [])
                    if entries:
                        # Take the best match
                        match = entries[0]
                        identities.append(VesselIdentity(
                            mmsi=mmsi,
                            imo=match.get("imo"),
                            name=match.get("shipname"),
                            vessel_type=match.get("vesselType"),
                            flag=match.get("flag")
                        ))
                except Exception as e:
                    logger.error(f"Failed to fetch GFW identity for MMSI {mmsi}: {str(e)}")
                    
        return identities

    async def search_vessel_presence(
        self, 
        min_lon: float, 
        min_lat: float, 
        max_lon: float, 
        max_lat: float,
        start_time: datetime, 
        end_time: datetime
    ) -> Tuple[List[GFWPresenceRecord], GFWAISProvenance]:
        """
        Queries GFW 4Wings API for vessel presence in a bounding box.
        Resolution is approximately 1 position per hour per vessel.
        """
        provenance = GFWAISProvenance(
            api_endpoint=f"{self.base_url}/4wings",
            requested_bbox=f"{min_lon},{min_lat},{max_lon},{max_lat}",
            requested_time_range=f"{start_time.isoformat()}/{end_time.isoformat()}",
            retrieval_time=datetime.utcnow()
        )
        
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        # In a real implementation, this would call the 4Wings reports API.
        # However, 4Wings requires setting up a report job and downloading CSV/JSON.
        # For Phase 16A feasibility, we mock the GFW response structure if token is valid but we aren't doing a real job loop.
        # We will assume a future implementation handles the async report polling.
        
        records: List[GFWPresenceRecord] = []
        # TODO: Implement actual 4Wings job creation and polling here
        logger.info("GFW 4Wings API implementation is a stub for Phase 16A.")
        
        return records, provenance

    async def get_vessel_events(
        self, 
        gfw_vessel_id: str, 
        start_time: datetime, 
        end_time: datetime
    ) -> List[GFWEvent]:
        """
        Queries GFW Events API for encounters, port visits, loitering, and AIS gaps.
        """
        if not self.token:
            raise RuntimeError("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            
        events = []
        headers = {"Authorization": f"Bearer {self.token}"}
        
        url = f"{self.base_url}/events"
        params: Dict[str, str | int] = {
            "vessels": gfw_vessel_id,
            "start-date": start_time.strftime("%Y-%m-%d"),
            "end-date": end_time.strftime("%Y-%m-%d"),
            "limit": 50
        }
        
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, params=params, timeout=10.0)
                resp.raise_for_status()
                data = resp.json()
                
                for item in data.get("entries", []):
                    # GFW timestamps are ISO8601
                    st = item.get("start")
                    et = item.get("end")
                    pos = item.get("position", {})
                    
                    event = GFWEvent(
                        event_id=item.get("id"),
                        event_type=item.get("type"),
                        start_time=datetime.fromisoformat(st.replace("Z", "+00:00")).replace(tzinfo=None) if st else datetime.utcnow(),
                        end_time=datetime.fromisoformat(et.replace("Z", "+00:00")).replace(tzinfo=None) if et else datetime.utcnow(),
                        start_lon=pos.get("lon"),
                        start_lat=pos.get("lat"),
                        end_lon=pos.get("lon"),
                        end_lat=pos.get("lat"),
                        vessel_id=gfw_vessel_id,
                        details={
                            "regions": item.get("regions"),
                            "event_info": item.get("event_info")
                        }
                    )
                    events.append(event)
        except Exception as e:
            logger.error(f"Failed to fetch GFW events for vessel {gfw_vessel_id}: {str(e)}")
            
        return events


