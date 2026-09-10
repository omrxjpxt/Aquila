from typing import Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime


class EvidenceEvent(BaseModel):
    id: str
    investigation_id: str
    owner_uid: str = Field(default="SYSTEM", description="Inherited from Investigation")

    event_time: datetime = Field(...,
                                 description="When this event occurred conceptually (e.g. T0, or satellite pass time)")
    logged_at: datetime = Field(default_factory=datetime.utcnow, description="When this was added to the timeline")

    event_type: str = Field(..., description="e.g. SATELLITE_DETECTION, AIS_ANOMALY, HINDCAST_COMPLETE, CONCLUSION")
    severity: str = Field(default="INFO", description="e.g. INFO, WARNING, CRITICAL")

    source: str = Field(..., description="Where this evidence came from (e.g. Sentinel-1, AIS, Attribution Engine)")
    description: str

    status: Optional[str] = Field(default="ATTACHED", description="Status of the evidence item")
    provenance: Optional[str] = Field(default=None, description="Data provenance: LIVE, REAL_DATA_TRAINED, DEMO_MOCK, or UNAVAILABLE")
    metadata: Optional[Any] = Field(default=None, description="Optional structured data related to the event")
