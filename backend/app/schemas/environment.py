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
    is_mock: bool = Field(default=False, description="True if this is deterministic mock data")

class WindObservation(EnvironmentalObservation):
    """Wind conditions for context."""
    speed_m_s: float = Field(..., description="Wind speed in meters per second")
    direction_deg: float = Field(..., description="Wind direction (meteorological convention, coming from)")

class CurrentObservation(EnvironmentalObservation):
    """Ocean current conditions for context."""
    speed_m_s: float = Field(..., description="Current speed in meters per second")
    direction_deg: float = Field(..., description="Current direction (oceanographic convention, going to)")

class OpticalAvailability(EnvironmentalObservation):
    """Availability of corresponding optical satellite imagery (e.g., Sentinel-2)."""
    status: OpticalAvailabilityStatus = Field(..., description="Availability status")
