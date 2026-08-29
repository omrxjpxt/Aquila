from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class EvidenceEvent(BaseModel):
    id: str
    investigation_id: str
    
    event_time: datetime = Field(..., description="When this event occurred conceptually (e.g. T0, or satellite pass time)")
    logged_at: datetime = Field(default_factory=datetime.utcnow, description="When this was added to the timeline")
    
    event_type: str = Field(..., description="e.g. SATELLITE_DETECTION, AIS_ANOMALY, HINDCAST_COMPLETE, CONCLUSION")
    severity: str = Field(default="INFO", description="e.g. INFO, WARNING, CRITICAL")
    
    source: str = Field(..., description="Where this evidence came from (e.g. Sentinel-1, AIS, Attribution Engine)")
    description: str
    
    metadata: Optional[Any] = Field(default=None, description="Optional structured data related to the event")
