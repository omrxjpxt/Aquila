import pytest
from datetime import datetime, timezone, timedelta
from app.services.open_meteo_service import OpenMeteoEnvironmentalService
from app.schemas.environment import WindObservation, CurrentObservation

@pytest.fixture
def env_service():
    return OpenMeteoEnvironmentalService()

def test_nearest_hourly_index(env_service):
    times = [
        "2024-05-27T16:00Z",
        "2024-05-27T17:00Z",
        "2024-05-27T18:00Z"
    ]
    target_dt = datetime(2024, 5, 27, 17, 22, 35, tzinfo=timezone.utc)
    
    idx = env_service._find_nearest_hourly_index(times, target_dt)
    assert idx == 1  # 17:00 is closest to 17:22

def test_excessive_time_mismatch(env_service):
    times = [
        "2024-05-27T10:00Z",
        "2024-05-27T11:00Z"
    ]
    target_dt = datetime(2024, 5, 27, 17, 22, 35, tzinfo=timezone.utc)
    
    idx = env_service._find_nearest_hourly_index(times, target_dt)
    assert idx == -1  # > 90 minutes away

@pytest.mark.asyncio
async def test_get_wind_success(env_service, monkeypatch):
    async def mock_get(*args, **kwargs):
        class MockResponse:
            def raise_for_status(self): pass
            def json(self):
                return {
                    "latitude": 42.25,
                    "longitude": 9.5,
                    "hourly": {
                        "time": ["2024-05-27T17:00Z"],
                        "wind_speed_10m": [36.0], # km/h
                        "wind_direction_10m": [180]
                    }
                }
        return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)

    obs = await env_service.get_wind(42.25, 9.5, datetime(2024, 5, 27, 17, 10, 0, tzinfo=timezone.utc))
    assert obs.availability_status == "AVAILABLE"
    assert obs.speed_m_s == 10.0  # 36 * (1000/3600)
    assert obs.direction_deg == 180
    assert obs.dataset == "ECMWF ERA5"
    assert obs.provider == "Open-Meteo"

@pytest.mark.asyncio
async def test_get_current_null_coastal(env_service, monkeypatch):
    async def mock_get(*args, **kwargs):
        class MockResponse:
            def raise_for_status(self): pass
            def json(self):
                return {
                    "latitude": 42.225,
                    "longitude": 9.225,
                    "hourly": {
                        "time": ["2024-05-27T17:00Z"],
                        "ocean_current_velocity": [None],
                        "ocean_current_direction": [None]
                    }
                }
        return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient.get", mock_get)

    obs = await env_service.get_current(42.225, 9.225, datetime(2024, 5, 27, 17, 10, 0, tzinfo=timezone.utc))
    assert obs.availability_status == "UNAVAILABLE"
    assert obs.speed_m_s is None
    assert obs.dataset == "CMEMS Global Ocean Physics"
