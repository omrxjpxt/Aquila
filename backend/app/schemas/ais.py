from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class VesselIdentity(BaseModel):
    mmsi: str = Field(..., description="Maritime Mobile Service Identity")
    imo: Optional[str] = None
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = None


class AISPosition(BaseModel):
    mmsi: Optional[str] = Field(default=None, exclude=True)
    timestamp: datetime
    lon: float
    lat: float
    speed_knots: Optional[float] = None
    heading: Optional[float] = None
    navigation_status: Optional[str] = None
    quality: str = Field(default="OBSERVED", description="OBSERVED or INTERPOLATED")


class AISGap(BaseModel):
    start_time: datetime
    end_time: datetime
    duration_hours: float
    start_lon: float
    start_lat: float
    end_lon: float
    end_lat: float


class AISTrack(BaseModel):
    mmsi: str
    # List of continuous segments, each is a list of coordinates
    # We use a GeoJSON MultiLineString representation for rendering
    geometry: Any = Field(..., description="GeoJSON MultiLineString of OBSERVED segments")
    gap_geometry: Any = Field(default=None, description="GeoJSON MultiLineString of GAP segments")

    positions: List[AISPosition] = Field(default_factory=list)
    gaps: List[AISGap] = Field(default_factory=list)

    total_observations: int
    longest_gap_hours: float
    coverage_quality: str = Field(default="GOOD", description="GOOD, MODERATE, LIMITED, POOR")


class AISProvenance(BaseModel):
    source: str = Field(default="AQUILA MockAISProvider")
    mode: str = Field(default="DEMO_MOCK", description="LIVE or DEMO_MOCK")
    retrieval_time: datetime = Field(default_factory=datetime.utcnow)
    limitations: str = Field(default="Demonstration data. Not a confirmed source.")


class VesselCandidate(BaseModel):
    id: str
    investigation_id: str
    identity: VesselIdentity
    track: AISTrack

    # Filtering context
    spatially_relevant: bool = Field(..., description="Did it intersect or approach the origin region?")
    temporally_relevant: bool = Field(..., description="Was it present during the release window?")
    closest_approach_meters: Optional[float] = None
    inside_origin_region: bool = False

    provenance: AISProvenance = Field(default_factory=AISProvenance)


class GFWPresenceRecord(BaseModel):
    """Represents aggregated vessel presence from GFW, NOT a continuous track."""
    vessel_id: str
    timestamp: datetime
    lon: float
    lat: float
    resolution: str = Field(default="~1 position per hour", description="Temporal resolution of the presence data")


class GFWEvent(BaseModel):
    """Represents a vessel event from GFW (e.g., gap, encounter, port_visit)"""
    event_id: str
    event_type: str
    start_time: datetime
    end_time: datetime
    start_lon: Optional[float] = None
    start_lat: Optional[float] = None
    end_lon: Optional[float] = None
    end_lat: Optional[float] = None
    vessel_id: str
    details: Dict[str, Any] = Field(default_factory=dict)


class GFWAISProvenance(AISProvenance):
    source: str = "GFW"
    dataset: str = "public-global-presence:latest"
    api_version: str = "v3"
    api_endpoint: str = ""
    requested_bbox: Optional[str] = None
    requested_time_range: Optional[str] = None
    spatial_resolution: str = "AIS-derived, ~vessel-level"
    temporal_resolution: str = "~1 position per hour per vessel"
    limitations: str = "GFW vessel presence is AIS-derived aggregated data, not raw high-frequency AIS tracks. Approximately one position per hour. Gaps in AIS coverage are possible."


class GFWCandidateEvidence(BaseModel):
    """Evidence model specifically for GFW candidate filtering, acknowledging it is not a high-frequency track."""
    id: str
    investigation_id: str
    identity: VesselIdentity
    presence_records: List[GFWPresenceRecord] = Field(default_factory=list)
    events: List[GFWEvent] = Field(default_factory=list)

    # Filtering context
    spatially_relevant: bool = Field(..., description="Did it intersect or approach the origin region?")
    temporally_relevant: bool = Field(..., description="Was it present during the release window?")
    closest_approach_meters: Optional[float] = None
    inside_origin_region: bool = False

    provenance: GFWAISProvenance = Field(default_factory=GFWAISProvenance)


class FleetVessel(BaseModel):
    id: str
    mmsi: Optional[str] = None
    imo: Optional[str] = None
    name: Optional[str] = None
    vessel_type: Optional[str] = None
    flag: Optional[str] = None
    last_position_lat: Optional[float] = None
    last_position_lon: Optional[float] = None
    last_timestamp: Optional[datetime] = None
    status: Optional[str] = "UNKNOWN"
    risk_level: Optional[str] = "NOT_ASSESSED"
    provider: str = "Global Fishing Watch"
    provenance: Optional[AISProvenance] = None
    
    # Area-specific presence fields
    presence_hours: Optional[float] = None
    last_observed_at: Optional[datetime] = None
    presence_verified: Optional[bool] = None
    presence_source: Optional[str] = None


class FleetResponse(BaseModel):
    provider: str = "Global Fishing Watch"
    status: str = "UNAVAILABLE"  # LIVE | UNAVAILABLE | EMPTY | REPORT_PENDING
    reason: Optional[str] = None
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
    total: int = 0
    vessels: List[FleetVessel] = Field(default_factory=list)
    active_investigations_count: int = 0
    
    # Area-specific context
    scope: Optional[str] = None
    observation_area: Optional[Dict[str, Any]] = None
    presence_window: Optional[Dict[str, str]] = None
    dataset: Optional[str] = None


class VesselDetailResponse(BaseModel):
    mmsi: str
    provider: str = "Global Fishing Watch"
    status: str = "UNAVAILABLE"  # LIVE | UNAVAILABLE | NOT_FOUND
    reason: Optional[str] = None
    vessel: Optional[FleetVessel] = None
    historical_track_available: bool = False
    historical_track_message: str = "Historical track unavailable from current provider."
    retrieved_at: datetime = Field(default_factory=datetime.utcnow)
