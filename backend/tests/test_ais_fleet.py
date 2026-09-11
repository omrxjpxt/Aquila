import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import httpx

from app.main import app
from app.services.gfw_ais_provider import GFWAISProvider

client = TestClient(app)


def test_fleet_endpoint_unauthenticated():
    """Verify that /api/v1/ais/fleet requires authentication."""
    from app.api.deps import get_current_user
    override = app.dependency_overrides.pop(get_current_user, None)
    try:
        resp = client.get("/api/v1/ais/fleet")
        assert resp.status_code == 401
    finally:
        if override:
            app.dependency_overrides[get_current_user] = override


def test_fleet_endpoint_unconfigured():
    """When GFW_API_TOKEN is unconfigured, returns UNAVAILABLE without fake vessels."""
    resp = client.get("/api/v1/ais/fleet", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["provider"] == "Global Fishing Watch"
    assert data["status"] == "UNAVAILABLE"
    assert "GFW_API_TOKEN is not configured" in data["reason"]
    assert data["total"] == 0
    assert len(data["vessels"]) == 0
    assert "active_investigations_count" in data


def test_vessel_detail_unconfigured():
    """When GFW_API_TOKEN is unconfigured, vessel detail returns UNAVAILABLE."""
    resp = client.get("/api/v1/ais/vessels/123456789", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["mmsi"] == "123456789"
    assert data["status"] == "UNAVAILABLE"
    assert "GFW_API_TOKEN is not configured" in data["reason"]
    assert data["vessel"] is None
    assert data["historical_track_available"] is False


@pytest.mark.asyncio
async def test_fleet_endpoint_configured_live(monkeypatch):
    """When GFW is configured and responds, returns LIVE vessels with honest risk and provenance."""
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code
        def raise_for_status(self):
            pass
        def json(self):
            return self._json

    async def mock_get(*args, **kwargs):
        return MockResponse({
            "entries": [
                {
                    "id": "vessel-gfw-1",
                    "mmsi": "311000123",
                    "imo": "9876543",
                    "shipname": "PACIFIC TITAN",
                    "vesselType": "TANKER",
                    "flag": "BHS",
                    "lastPosition": {
                        "lat": 24.5,
                        "lon": 58.2,
                        "timestamp": "2026-09-10T12:00:00Z"
                    }
                }
            ]
        })

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    provider = GFWAISProvider(token="valid-test-token")
    fleet_resp = await provider.get_fleet(query="tanker")
    assert fleet_resp.status == "LIVE"
    assert fleet_resp.total == 1
    assert len(fleet_resp.vessels) == 1
    v = fleet_resp.vessels[0]
    assert v.name == "PACIFIC TITAN"
    assert v.mmsi == "311000123"
    assert v.last_position_lat == 24.5
    assert v.last_position_lon == 58.2
    assert v.risk_level == "NOT_ASSESSED"
    assert v.provenance.mode == "LIVE"


@pytest.mark.asyncio
async def test_vessel_detail_configured_live(monkeypatch):
    """When GFW is configured, queries specific vessel by MMSI."""
    class MockResponse:
        def __init__(self, json_data, status_code=200):
            self._json = json_data
            self.status_code = status_code
        def raise_for_status(self):
            pass
        def json(self):
            return self._json

    async def mock_get(*args, **kwargs):
        return MockResponse({
            "entries": [
                {
                    "id": "vessel-gfw-1",
                    "mmsi": "311000123",
                    "imo": "9876543",
                    "shipname": "PACIFIC TITAN",
                    "vesselType": "TANKER",
                    "flag": "BHS"
                }
            ]
        })

    monkeypatch.setattr(httpx.AsyncClient, "get", mock_get)

    provider = GFWAISProvider(token="valid-test-token")
    detail_resp = await provider.get_vessel_by_mmsi("311000123")
    assert detail_resp.status == "LIVE"
    assert detail_resp.vessel is not None
    assert detail_resp.vessel.name == "PACIFIC TITAN"
    assert detail_resp.historical_track_available is False


def test_vessel_detail_invalid_mmsi():
    """Verify that invalid MMSI returns 400 Bad Request."""
    resp = client.get("/api/v1/ais/vessels/invalid_mmsi", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 400
    assert "Invalid MMSI" in resp.json()["detail"]

    resp_short = client.get("/api/v1/ais/vessels/1234", headers={"Authorization": "Bearer demo-token"})
    assert resp_short.status_code == 400


def test_candidates_endpoint_live_mode_unconfigured():
    """When GFW_API_TOKEN is unconfigured, candidate discovery in LIVE/GFW mode returns 503."""
    payload = {
        "investigation_id": "test-inv",
        "origin": {
            "id": "orig-1",
            "slick_id": "slick-1",
            "scenario_id": "test-inv",
            "estimated_time": datetime.utcnow().isoformat(),
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[58.0, 24.0], [58.5, 24.0], [58.5, 24.5], [58.0, 24.5], [58.0, 24.0]]]
            }
        },
        "start_time": datetime.utcnow().isoformat(),
        "end_time": datetime.utcnow().isoformat(),
        "mode": "GFW"
    }
    resp = client.post("/api/v1/ais/candidates", json=payload, headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 503
    assert "Global Fishing Watch provider is UNAVAILABLE" in resp.json()["detail"]


def test_candidates_endpoint_mock_mode():
    """MOCK mode works for explicit demo workflows and returns mock candidates with DEMO_MOCK provenance."""
    now = datetime.utcnow()
    payload = {
        "investigation_id": "test-inv",
        "origin": {
            "id": "orig-1",
            "slick_id": "slick-1",
            "scenario_id": "test-inv",
            "estimated_time": now.isoformat(),
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[58.0, 24.0], [58.5, 24.0], [58.5, 24.5], [58.0, 24.5], [58.0, 24.0]]]
            }
        },
        "start_time": (now - timedelta(hours=12)).isoformat(),
        "end_time": (now + timedelta(hours=12)).isoformat(),
        "mode": "MOCK"
    }
    resp = client.post("/api/v1/ais/candidates", json=payload, headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    candidates = resp.json()
    assert len(candidates) > 0
    assert candidates[0]["provenance"]["mode"] == "DEMO_MOCK"


def test_gfw_readiness_and_secret_redaction():
    """Verify safe readiness check and ensure secret token is never exposed."""
    secret = "secret-gfw-super-confidential-token-12345"
    provider_configured = GFWAISProvider(token=secret)
    assert provider_configured.is_configured is True
    
    # Safe string representation must NOT expose the secret
    rep = repr(provider_configured)
    assert secret not in rep
    assert "configured=True" in rep

    provider_unconfigured = GFWAISProvider(token="")
    assert provider_unconfigured.is_configured is False
    assert "configured=False" in repr(provider_unconfigured)
    assert secret not in repr(provider_unconfigured)

