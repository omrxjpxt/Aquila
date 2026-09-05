from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class OpticalAvailabilityStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    CLOUD_OBSCURED = "CLOUD_OBSCURED"
    UNAVAILABLE = "UNAVAILABLE"
    NOT_REQUESTED = "NOT_REQUESTED"
    UNKNOWN = "UNKNOWN"


class EnvironmentalObservation(BaseModel):
    """Base class for environmental observations."""
    source: str = Field(..., description="Provider or source of the data (e.g., ERA5, HYCOM, MOCK)")
    timestamp: datetime = Field(..., description="Valid time of this observation")
    resolution: str = Field(default="UNKNOWN", description="Spatial/temporal resolution of the data")
    provider: str = Field(..., description="API Provider (e.g. Open-Meteo, DEMO_MOCK)")
    dataset: Optional[str] = Field(default=None, description="Underlying scientific dataset/model")
    requested_lat: Optional[float] = Field(default=None, description="Requested query latitude")
    requested_lon: Optional[float] = Field(default=None, description="Requested query longitude")
    returned_lat: Optional[float] = Field(default=None, description="Returned model grid latitude")
    returned_lon: Optional[float] = Field(default=None, description="Returned model grid longitude")
    requested_timestamp: Optional[datetime] = Field(default=None, description="Target timestamp for lookup")
    time_offset_hours: Optional[float] = Field(default=None, description="Hours difference between target and available observation")
    retrieval_timestamp: Optional[datetime] = Field(default=None, description="When the query was made")
    api_endpoint: Optional[str] = Field(default=None, description="Endpoint used for lookup")
    availability_status: str = Field(default="AVAILABLE", description="AVAILABLE or UNAVAILABLE")
    is_mock: bool = Field(default=False, description="True if this is deterministic mock data")


class WindObservation(EnvironmentalObservation):
    """Wind conditions for context."""
    speed_m_s: Optional[float] = Field(default=None, description="Wind speed in meters per second")
    direction_deg: Optional[float] = Field(default=None, description="Wind direction (meteorological convention, coming from)")


class CurrentObservation(EnvironmentalObservation):
    """Ocean current conditions for context."""
    speed_m_s: Optional[float] = Field(default=None, description="Current speed in meters per second")
    direction_deg: Optional[float] = Field(default=None, description="Current direction (oceanographic convention, going to)")


class OpticalAvailability(EnvironmentalObservation):
    """Availability of corresponding optical satellite imagery (e.g., Sentinel-2)."""
    status: OpticalAvailabilityStatus = Field(..., description="Availability status")
