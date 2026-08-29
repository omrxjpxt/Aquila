from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime

class OriginEstimate(BaseModel):
    id: str
    slick_id: str
    
    estimated_time: datetime = Field(..., description="Estimated time of the spill (T0)")
    time_uncertainty_hours: float = Field(default=0.0, description="+/- uncertainty in hours")
    
    # [longitude, latitude]
    estimated_location: List[float] = Field(..., description="Estimated origin coordinate [lon, lat]")
    spatial_uncertainty_meters: float = Field(default=0.0, description="Radius of uncertainty in meters")
    
    confidence: float = Field(..., description="Confidence score of this origin estimate (0-1)")

class DriftResult(BaseModel):
    id: str
    slick_id: str
    run_time: datetime = Field(..., description="When the simulation was run")
    
    trajectory_geojson: Any = Field(..., description="GeoJSON LineString or MultiLineString representing the particle trajectories")
    
    model_used: str = Field(..., description="Which model was used (e.g. OpenDrift/OpenOil)")
    metocean_sources: List[str] = Field(..., description="Data sources used (e.g. ['Copernicus_Currents', 'ERA5_Winds'])")
