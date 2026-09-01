from datetime import datetime, timezone, timedelta
from app.schemas.drift import DriftScenario
from app.schemas.slick import Slick
from app.services.drift_service import DriftService

def test_mock_drift_engine_hindcast():
    service = DriftService()
    
    start_time = datetime.now(timezone.utc)
    end_time = start_time - timedelta(hours=24)
    
    scenario = DriftScenario(
        scenario_id="test_1",
        investigation_id="inv_1",
        start_time=start_time,
        end_time=end_time,
        is_backward=True
    )
    
    slick = Slick(
        id="slick_1",
        investigation_id="inv_1",
        source_scene_id="scene_1",
        detected_at=start_time,
        area_sq_km=2.0,
        geometry={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]}
    )
    
    res = service.execute_hindcast(scenario, slick)
    
    assert res.id == "res_test_1"
    assert res.scenario_id == "test_1"
    assert res.origin_estimate is not None
    assert res.origin_estimate.geometry["type"] == "Polygon"
    assert res.provenance.mode == "DEMO_MOCK"
    assert res.provenance.engine == "MockDriftEngine"
    assert len(res.trajectories) == 1
    
    traj = res.trajectories[0]
    assert len(traj.coordinates) == 25 # start + 24 hours
    assert traj.timestamps[-1] == end_time


def test_mock_drift_engine_forecast():
    service = DriftService()
    
    start_time = datetime.now(timezone.utc)
    end_time = start_time + timedelta(hours=24)
    
    # We need a backward run first to get an origin, or we can mock it
    scenario_h = DriftScenario(
        scenario_id="test_h",
        investigation_id="inv_1",
        start_time=start_time,
        end_time=start_time - timedelta(hours=24),
        is_backward=True
    )
    
    slick = Slick(
        id="slick_1",
        investigation_id="inv_1",
        source_scene_id="scene_1",
        detected_at=start_time,
        area_sq_km=2.0,
        geometry={"type": "Polygon", "coordinates": [[[0,0],[0,1],[1,1],[1,0],[0,0]]]}
    )
    
    res_h = service.execute_hindcast(scenario_h, slick)
    
    scenario_f = DriftScenario(
        scenario_id="test_f",
        investigation_id="inv_1",
        start_time=res_h.origin_estimate.estimated_time,
        end_time=start_time,
        is_backward=False
    )
    
    res_f = service.execute_forecast(scenario_f, res_h.origin_estimate)
    
    assert res_f.id == "fres_test_f"
    assert res_f.forecast_geometry["type"] == "Polygon"
    assert res_f.provenance.mode == "DEMO_MOCK"
    assert res_f.provenance.engine == "MockDriftEngine"
    
    traj = res_f.trajectories[0]
    # Forecast moves forward in time
    assert traj.timestamps[-1] > traj.timestamps[0]
