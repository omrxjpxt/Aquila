from typing import Optional, List, Tuple
from pydantic import BaseModel, Field
from datetime import datetime

class SatelliteScene(BaseModel):
    id: str = Field(..., description="Unique scene identifier from the provider (e.g. Sentinel-1 product ID)")
    provider: str = Field(..., description="Source provider (e.g. SENTINEL_1, SENTINEL_2, COMMERCIAL)")
    acquisition_time: datetime = Field(..., description="Time the scene was acquired")
    
    # Simple bounding box representation for the foundation
    # [min_lon, min_lat, max_lon, max_lat]
    bbox: Tuple[float, float, float, float] = Field(..., description="Bounding box of the scene")
    
    cloud_cover: Optional[float] = Field(default=None, description="Percentage of cloud cover (0-100), mostly for optical")
    data_quality_score: Optional[float] = Field(default=None, description="Confidence/quality score for the scene (0-1)")
    
    storage_path: str = Field(..., description="URI or path to the raw/processed asset (e.g. gs://aquila-assets/scene-id.tiff)")
