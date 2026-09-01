from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class DriftScenario(BaseModel):
    scenario_id: str = Field(..., description="Unique scenario identifier")
    investigation_id: str
    slick_id: Optional[str] = None

    start_time: datetime
    end_time: datetime
    is_backward: bool = Field(..., description="True for hindcast, False for forecast")

    release_window_hours: float = Field(default=0.0,
                                        description="Duration of continuous release in hours, if applicable")

    forcing_sources: List[str] = Field(default_factory=list, description="List of environmental sources to use")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Model-specific parameters")


class OriginEstimate(BaseModel):
    id: str
    slick_id: str
    scenario_id: str

    estimated_time: datetime = Field(..., description="Estimated time of the spill (T0)")
    time_uncertainty_hours: float = Field(default=0.0, description="+/- uncertainty in hours")

    # Use GeoJSON geometry for the origin region (e.g. Polygon)
    geometry: Any = Field(..., description="GeoJSON representation of the demonstration origin region")

    limitations: str = Field(default="Demonstration Origin Region. NOT A SCIENTIFICALLY INFERRED SOURCE LOCATION.")


class DriftTrajectory(BaseModel):
    id: str
    # Array of [lon, lat] points
    coordinates: List[List[float]] = Field(..., description="Array of coordinates [lon, lat] along the trajectory")
    timestamps: List[datetime] = Field(..., description="Array of timestamps corresponding to each coordinate")
    particle_count: int = Field(default=1, description="Number of particles represented by this trajectory cluster")


class DriftUncertainty(BaseModel):
    geometry: Any = Field(..., description="GeoJSON representation of the uncertainty envelope")
    label: str = Field(default="Demo Uncertainty Envelope")


class DriftProvenance(BaseModel):
    mode: str = Field(default="DEMO_MOCK", description="Must be DEMO_MOCK until OpenDrift is integrated")
    engine: str = Field(default="MockDriftEngine")
    forcing: str = Field(default="MockEnvironmentalDataService")
    model_status: str = Field(default="NOT_PHYSICALLY_VALIDATED")
    limitations: str = Field(
        default="This trajectory is generated for development/demo purposes and is not a physically validated oil-spill forecast.")


class DriftResult(BaseModel):
    """Result for backward hindcast."""
    id: str
    scenario_id: str
    slick_id: str
    run_time: datetime = Field(..., description="When the simulation was run")

    origin_estimate: Optional[OriginEstimate] = None
    trajectories: List[DriftTrajectory] = Field(default_factory=list)
    uncertainty: Optional[DriftUncertainty] = None

    provenance: DriftProvenance = Field(default_factory=DriftProvenance)


class ForecastResult(BaseModel):
    """Result for forward forecast."""
    id: str
    scenario_id: str
    origin_id: Optional[str] = None
    run_time: datetime = Field(..., description="When the simulation was run")

    forecast_geometry: Any = Field(..., description="GeoJSON representation of the demonstration predicted extent")
    trajectories: List[DriftTrajectory] = Field(default_factory=list)
    uncertainty: Optional[DriftUncertainty] = None

    provenance: DriftProvenance = Field(default_factory=DriftProvenance)
