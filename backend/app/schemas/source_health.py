from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class SourceHealthItem(BaseModel):
    """Structured health and provenance metadata for an intelligence source."""
    id: str = Field(..., description="Unique provider key (e.g. cdse, gfw, opendrift)")
    name: str = Field(..., description="Human readable name of source")
    provider: str = Field(..., description="Provider organization or framework")
    status: str = Field(..., description="Health status: LIVE, READY, UNAVAILABLE, DEGRADED, ERROR, DEMO_MOCK")
    mode: str = Field(..., description="Operational mode: LIVE, LOCAL, UNAVAILABLE, DEMO_MOCK")
    configured: bool = Field(..., description="Whether source credentials/artifacts are configured")
    available: bool = Field(..., description="Whether source is currently operational")
    last_checked: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of health check")
    reason: Optional[str] = Field(None, description="Diagnostic explanation for the status")
    provenance: Optional[str] = Field(None, description="Source provenance or underlying engine reference")


class SystemStatusResponse(BaseModel):
    """Consolidated system status and source health response."""
    status: str = Field(default="online", description="Overall system health status")
    service: str = Field(..., description="Service name")
    persistence: str = Field(..., description="Persistence backend (sqlite or firestore)")
    providers: Dict[str, str] = Field(default_factory=dict, description="Simple key -> status mapping")
    sources: Dict[str, SourceHealthItem] = Field(default_factory=dict, description="Rich source status metadata")
