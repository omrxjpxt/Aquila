from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class VesselCandidate(BaseModel):
    mmsi: str = Field(..., description="Maritime Mobile Service Identity")
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = None
    
    # Additional static data could go here (e.g. IMO number, gross tonnage)

class AttributionResult(BaseModel):
    id: str
    investigation_id: str
    mmsi: str
    
    # 6-factor forensic evidence matrix as per requirements
    spatial_compatibility: float = Field(..., description="0-1 score")
    temporal_compatibility: float = Field(..., description="0-1 score")
    trajectory_compatibility: float = Field(..., description="0-1 score")
    drift_compatibility: float = Field(..., description="0-1 score")
    behavioural_evidence: float = Field(..., description="0-1 score")
    ais_data_quality: float = Field(..., description="0-1 score")
    
    overall_confidence: float = Field(..., description="Aggregate confidence score (0-1)")
    
    generated_at: datetime
    is_primary_candidate: bool = Field(default=False)
