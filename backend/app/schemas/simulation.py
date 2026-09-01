from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from datetime import datetime

class DifferenceGeometry(BaseModel):
    overlap_polygon: Optional[Dict[str, Any]] = None
    observed_only_polygon: Optional[Dict[str, Any]] = None
    simulated_only_polygon: Optional[Dict[str, Any]] = None

class SimulationComparison(BaseModel):
    spatial_agreement_iou: float
    overlap_area_km2: float
    observed_area_km2: float
    simulated_area_km2: float
    centroid_distance_meters: float
    
    trajectory_comparison: str
    temporal_comparison: str
    
    spatial_interpretation: str # e.g. "PARTIAL_OVERLAP"
    human_readable_interpretation: str

class SimulationProvenance(BaseModel):
    mode: str = "DEMO_MOCK"
    engine: str = "MockDriftEngine"
    model_status: str = "NOT_PHYSICALLY_VALIDATED"
    observed_data_source: str
    simulation_forcing_source: str
    scenario_parameters: Dict[str, Any]
    limitations: str

class CounterfactualScenario(BaseModel):
    investigation_id: str
    candidate_vessel_id: str
    hypothesized_release_time: datetime
    hypothesized_release_location: List[float] # [lon, lat]
    drift_duration_hours: float
    observed_slick_geometry: Dict[str, Any]
    scenario_parameters: Dict[str, Any] = {}

class CounterfactualResult(BaseModel):
    scenario_id: str
    scenario: CounterfactualScenario
    simulated_slick_geometry: Dict[str, Any]
    simulated_trajectory: List[List[float]] # [lon, lat] history
    difference_geometry: DifferenceGeometry
    comparison: SimulationComparison
    provenance: SimulationProvenance
