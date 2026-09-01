from typing import Optional, List, Any
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
