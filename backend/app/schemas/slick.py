from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime

class Slick(BaseModel):
    id: str = Field(..., description="Unique slick detection identifier")
    investigation_id: str
    source_scene_id: str
    
    detected_at: datetime
    
    # Geometry could be represented as GeoJSON polygon dictionaries
    geometry: Any = Field(..., description="GeoJSON representation of the slick polygon")
    
    area_sq_km: float = Field(..., description="Estimated surface area in square kilometers")
    confidence: float = Field(..., description="Detection model confidence score (0-1)")
    
    classification: str = Field(default="UNKNOWN", description="Classification of the slick (e.g. MINERAL_OIL, BIOGENIC, LOOKALIKE)")
    thickness_estimate: Optional[float] = Field(default=None, description="Estimated thickness in microns, if available")
