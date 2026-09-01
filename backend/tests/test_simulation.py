import pytest
from datetime import datetime, timezone
import json

from app.schemas.simulation import CounterfactualScenario
from app.services.simulation_service import CounterfactualSimulationService

def test_simulation_geometries():
    service = CounterfactualSimulationService()
    
    # Identical geometries
    geom_a = {
        "type": "Polygon",
        "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]
    }
    geom_b = {
        "type": "Polygon",
        "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]
    }
    
    iou, overlap, obs_a, sim_a, centroid, diff = service.compare_geometries(geom_a, geom_b)
    
    assert abs(iou - 1.0) < 0.001
    assert centroid == 0.0
    assert diff.observed_only_polygon is None
    assert diff.simulated_only_polygon is None
    assert diff.overlap_polygon is not None
    
    # Non-overlapping
    geom_c = {
        "type": "Polygon",
        "coordinates": [[[2,2], [2,3], [3,3], [3,2], [2,2]]]
    }
    
    iou, overlap, obs_a, sim_a, centroid, diff = service.compare_geometries(geom_a, geom_c)
    assert iou == 0.0
    assert overlap == 0.0
    assert centroid > 0.0
    assert diff.overlap_polygon is None
    assert diff.observed_only_polygon is not None
    assert diff.simulated_only_polygon is not None

def test_run_scenario():
    service = CounterfactualSimulationService()
    
    geom = {
        "type": "Polygon",
        "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]
    }
    
    scenario = CounterfactualScenario(
        investigation_id="inv1",
        candidate_vessel_id="12345",
        hypothesized_release_time=datetime(2026, 9, 1, 10, 0, tzinfo=timezone.utc),
        hypothesized_release_location=[0.5, 0.5],
        drift_duration_hours=24.0,
        observed_slick_geometry=geom
    )
    
    result = service.run_scenario(scenario)
    
    assert result.provenance.engine == "MockDriftEngine"
    assert result.provenance.model_status == "NOT_PHYSICALLY_VALIDATED"
    
    # The simulated polygon should be returned
    assert result.simulated_slick_geometry["type"] == "Polygon"
    
    # Interpretation test
    assert result.comparison.spatial_interpretation in ["PERFECT_OVERLAP", "STRONG_OVERLAP", "PARTIAL_OVERLAP", "MINIMAL_OVERLAP", "NO_OVERLAP"]
