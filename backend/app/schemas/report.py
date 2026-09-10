from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ReportArchiveItem(BaseModel):
    """
    Lightweight summary model for the /api/v1/reports archive listing.
    Does not contain heavy report payloads (SAR imagery, track geometries).
    """
    id: str = Field(..., description="Investigation ID")
    investigation_id: str = Field(..., description="Investigation ID alias for consistency")
    title: str = Field(..., description="Investigation or dossier title")
    priority: str = Field(default="NORMAL", description="Priority level (LOW, NORMAL, HIGH, CRITICAL)")
    status: str = Field(..., description="Current status (e.g. REPORT_READY, CLOSED, COMPLETED)")
    created_at: datetime = Field(..., description="Timestamp when investigation was created")
    updated_at: Optional[datetime] = Field(None, description="Timestamp when investigation was last updated")
    creation_mode: str = Field(default="MANUAL", description="Creation mode (MANUAL, AUTOMATIC_MONITORING, DEMO_MOCK)")
    provenance_mode: str = Field(default="LIVE", description="Overall evidentiary provenance (LIVE, DEMO_MOCK)")
    evidence_count: int = Field(default=0, description="Number of persisted forensic evidence records")
    has_attribution: bool = Field(default=False, description="Whether attribution analysis is completed")
