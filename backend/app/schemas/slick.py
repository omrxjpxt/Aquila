from typing import Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class Slick(BaseModel):
    id: str = Field(..., description="Unique detection identifier")
    investigation_id: Optional[str] = None
    source_scene_id: str

    detected_at: datetime

    geometry: Any = Field(..., description="GeoJSON representation of the candidate polygon")
    area_sq_km: float = Field(..., description="Estimated surface area in square kilometers")

    # We explicitly avoid "confidence" and use baseline threshold metrics
    classification: str = Field(
        default="BASELINE_CANDIDATE",
        description="Classification of the slick (e.g. BASELINE_CANDIDATE, MINERAL_OIL, LOOKALIKE)")

    baseline_score: Optional[float] = Field(default=None,
                                            description="Raw severity score or signal strength difference")
    threshold_info: Optional[Dict[str, Any]] = Field(
        default=None, description="Metadata about the threshold parameters used")

    supporting_metrics: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Other structural or radiometric metrics")
