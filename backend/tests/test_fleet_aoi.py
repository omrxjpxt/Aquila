import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime, timedelta
from app.api.v1.ais import get_fleet
from app.services.gfw_ais_provider import GFWAISProvider
from app.schemas.ais import FleetResponse
from fastapi import HTTPException

# Dummy zone repository mock
class MockZoneRepo:
    def get_zone(self, zone_id):
        if zone_id == "zone-1":
            mock_zone = MagicMock()
            mock_zone.id = "zone-1"
            mock_zone.owner_uid = "user-1"
            mock_zone.bbox = [50.0, 20.0, 60.0, 30.0]
            mock_zone.name = "Test Zone"
            return mock_zone
        return None
        
    def get_enabled_zones(self):
        mock_zone = MagicMock()
        mock_zone.id = "zone-1"
        mock_zone.owner_uid = "user-1"
        mock_zone.bbox = [50.0, 20.0, 60.0, 30.0]
        mock_zone.name = "Test Zone"
        return [mock_zone]

class MockInvestRepo:
    def list_investigations(self):
        return []

@pytest.fixture
def mock_zone_repo():
    return MockZoneRepo()
    
@pytest.fixture
def mock_invest_repo():
    return MockInvestRepo()

@pytest.mark.asyncio
async def test_fleet_no_token():
    provider = GFWAISProvider(token=None)
    provider.token = ""  # Force empty to ensure we test the no-token branch
    response = await provider.get_fleet_for_area((50.0, 20.0, 60.0, 30.0), "Test Zone")
    assert response.status == "UNAVAILABLE"
    assert "GFW_API_TOKEN is not configured" in response.reason
    assert "GFW_API_TOKEN is not configured" in response.reason

@pytest.mark.asyncio
@patch("app.services.gfw_ais_provider.httpx.AsyncClient")
async def test_fleet_report_running_timeout(mock_client_cls):
    mock_client = mock_client_cls.return_value.__aenter__.return_value
    mock_post_resp = MagicMock()
    mock_post_resp.json.return_value = {"url": "/v3/4wings/report/123", "status": "running"}
    mock_client.post.return_value = mock_post_resp
    
    mock_get_resp = MagicMock()
    mock_get_resp.json.return_value = {"status": "running"}
    mock_client.get.return_value = mock_get_resp
    
    provider = GFWAISProvider(token="test_token")
    provider._presence_cache = {} # Clear cache
    
    response = await provider.get_fleet_for_area((50.0, 20.0, 60.0, 30.0), "Test Zone")
    assert response.status == "UNAVAILABLE / REPORT_PENDING"
    assert "still running" in response.reason
    assert response.dataset == None # Not populated on error

@pytest.mark.asyncio
@patch("app.services.gfw_ais_provider.httpx.AsyncClient")
async def test_fleet_zero_vessels(mock_client_cls):
    mock_client = mock_client_cls.return_value.__aenter__.return_value
    mock_post_resp = MagicMock()
    mock_post_resp.json.return_value = {"status": "COMPLETED", "entries": []}
    mock_client.post.return_value = mock_post_resp
    
    provider = GFWAISProvider(token="test_token")
    provider._presence_cache = {} # Clear cache
    
    response = await provider.get_fleet_for_area((50.0, 20.0, 60.0, 30.0), "Test Zone")
    assert response.status == "EMPTY"
    assert response.total == 0
    assert response.dataset == "public-global-presence:latest"

@pytest.mark.asyncio
@patch("app.api.v1.ais.get_monitoring_zone_repository")
@patch("app.api.v1.ais.get_investigation_repository")
@patch.object(GFWAISProvider, "get_fleet_for_area")
async def test_get_fleet_endpoint_authorized(mock_get_fleet, mock_inv_repo, mock_zone_repo_factory, mock_zone_repo, mock_invest_repo):
    mock_zone_repo_factory.return_value = mock_zone_repo
    mock_inv_repo.return_value = mock_invest_repo
    
    mock_get_fleet.return_value = FleetResponse(status="LIVE", total=1, vessels=[], active_investigations_count=0)
    
    # User is owner
    user = {"uid": "user-1"}
    response = await get_fleet(zone_id="zone-1", limit=50, user=user)
    
    assert response.status == "LIVE"
    mock_get_fleet.assert_called_once_with(bbox=[50.0, 20.0, 60.0, 30.0], zone_name="Test Zone")

@pytest.mark.asyncio
@patch("app.api.v1.ais.get_monitoring_zone_repository")
async def test_get_fleet_endpoint_unauthorized(mock_zone_repo_factory, mock_zone_repo):
    mock_zone_repo_factory.return_value = mock_zone_repo
    
    # User is not owner
    user = {"uid": "user-2"}
    
    with pytest.raises(HTTPException) as exc:
        await get_fleet(zone_id="zone-1", limit=50, user=user)
        
    assert exc.value.status_code == 403
