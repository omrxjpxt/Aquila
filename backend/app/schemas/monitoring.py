from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


class MonitoringZone(BaseModel):
    """A geographic area configured for continuous monitoring."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique zone ID")
    name: str = Field(..., description="Human-readable name for the monitoring zone")
    bbox: Tuple[float, float, float, float] = Field(
        ..., 
        description="Bounding box [min_lon, min_lat, max_lon, max_lat]"
    )
    geometry: Optional[Dict[str, Any]] = Field(
        None, 
        description="Optional GeoJSON polygon for precise spatial filtering"
    )
    collection_filter: str = Field(
        default="sentinel-1-grd",
        description="Collection to monitor, e.g., 'sentinel-1-grd'"
    )


class NewSceneEvent(BaseModel):
    """Event emitted when a new Sentinel-1 product is discovered for a monitoring zone."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique event ID (UUID)")
    product_id: str = Field(..., description="CDSE OData product UUID. Acts as stable deduplication key.")
    product_name: str = Field(..., description="Full product name from CDSE catalog")
    collection: str = Field(default="sentinel-1-grd")
    acquisition_time: datetime = Field(..., description="Time the image was acquired by the satellite")
    publication_time: datetime = Field(..., description="Time the product was published in the catalog")
    geometry: Dict[str, Any] = Field(..., description="GeoJSON footprint from GeoFootprint")
    bbox: Tuple[float, float, float, float] = Field(..., description="Derived from geometry")
    monitoring_zone_id: Optional[str] = Field(None, description="ID of the matching monitoring zone")
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    discovery_source: str = Field(..., description="'CDSE_SUBSCRIPTION' or 'CDSE_RECONCILIATION'")
    
    # Optional metadata that might be available during discovery
    platform: Optional[str] = None
    orbit_direction: Optional[str] = None
    polarization: Optional[str] = None
    instrument_mode: Optional[str] = None


class SceneDiscoveryCheckpoint(BaseModel):
    """Persisted checkpoint to resume discovery without missing or duplicating products."""
    last_publication_date: datetime = Field(
        ..., 
        description="The highest PublicationDate processed so far"
    )
    known_product_ids: List[str] = Field(
        default_factory=list,
        description="List of product UUIDs recently processed to ensure idempotency"
    )
