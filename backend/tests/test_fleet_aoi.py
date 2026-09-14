import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, date
from app.api.v1.ais import get_fleet
from app.services.gfw_ais_provider import GFWAISProvider
from app.schemas.ais import FleetResponse
from fastapi import HTTPException

class MockZoneRepo:
    def get_zone(self, zone_id):
        if zone_id == "zone-1":
            mock_zone = MagicMock()
            mock_zone.id = "zone-1"
            mock_zone.owner_uid = "user-1"
            mock_zone.bbox = (50.0, 20.0, 60.0, 30.0)
            mock_zone.name = "Test Zone 1"
            return mock_zone
        elif zone_id == "zone-2":
            mock_zone = MagicMock()
            mock_zone.id = "zone-2"
            mock_zone.owner_uid = "user-1"
            mock_zone.bbox = (58.0, 24.0, 58.5, 24.5)
            mock_zone.name = "Gulf of Oman"
            return mock_zone
        return None
        
    def get_enabled_zones(self):
        z1 = MagicMock()
        z1.id = "zone-1"
        z1.owner_uid = "user-1"
        z1.bbox = (50.0, 20.0, 60.0, 30.0)
        z1.name = "Test Zone 1"
        return [z1]

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
    """M: No mock fallback exists when token is missing; returns UNAVAILABLE."""
    provider = GFWAISProvider(token=None)
    provider.token = ""
    response = await provider.get_fleet_for_area((50.0, 20.0, 60.0, 30.0), "Test Zone")
    assert response.status == "UNAVAILABLE"
    assert "GFW_API_TOKEN is not configured" in response.reason
    assert response.total == 0

@pytest.mark.asyncio
@patch("app.services.gfw_ais_provider.httpx.AsyncClient")
async def test_4wings_request_protocol_and_formatting(mock_client_cls):
    """
    Verifies items A, B, C, D, E:
    A. POST body is exactly {"geojson": ...}
    B. 4Wings parameters are in HTTP query parameters.
    C. dataset is public-global-presence:latest
    D. date-range is DATE ONLY: YYYY-MM-DD,YYYY-MM-DD
    E. date range lies completely before the dataset availability boundary.
    """
    mock_client = mock_client_cls.return_value.__aenter__.return_value
    
    mock_metadata_resp = MagicMock()
    mock_metadata_resp.status_code = 200
    mock_metadata_resp.json.return_value = {
        "endDate": "2026-09-10T00:00:00.000Z"
    }
    
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_post_resp.json.return_value = {
        "status": "COMPLETED",
        "entries": [
            {
                "public-global-presence:v4.0": [
                    {
                        "vesselId": "vessel-123",
                        "mmsi": "123456789",
                        "shipName": "TEST VESSEL",
                        "hours": 5.5,
                        "exitTimestamp": "2026-09-08T22:00:00Z",
                        "entryTimestamp": "2026-09-08T16:30:00Z",
                        "flag": "PAN",
                        "imo": "9876543",
                        "vesselType": "TANKER"
                    }
                ]
            }
        ]
    }
    
    mock_client.get.return_value = mock_metadata_resp
    mock_client.post.return_value = mock_post_resp
    
    provider = GFWAISProvider(token="test_token")
    provider._presence_cache = {}
    
    bbox = (58.0, 24.0, 58.5, 24.5)
    resp = await provider.get_fleet_for_area(bbox, "Gulf of Oman")
    
    assert resp.status == "LIVE"
    assert resp.total == 1
    
    post_args = mock_client.post.call_args
    assert post_args is not None
    
    url = post_args[0][0]
    assert url == "https://gateway.api.globalfishingwatch.org/v3/4wings/report"
    
    kwargs = post_args[1]
    params = kwargs.get("params", {})
    body = kwargs.get("json", {})
    
    # A. POST body is exactly {"geojson": ...}
    assert "geojson" in body
    assert body["geojson"]["type"] == "Polygon"
    assert len(body["geojson"]["coordinates"][0]) == 5
    assert set(body.keys()) == {"geojson"}
    
    # B. 4Wings parameters are in HTTP query parameters
    assert "datasets[0]" in params
    assert "date-range" in params
    assert "spatial-resolution" in params
    assert "temporal-resolution" in params
    assert "group-by" in params
    assert params["group-by"] == "VESSEL_ID"
    assert params["spatial-aggregation"] == "true"
    
    # C. dataset is public-global-presence:latest
    assert params["datasets[0]"] == "public-global-presence:latest"
    
    # D. date-range is DATE ONLY: YYYY-MM-DD,YYYY-MM-DD
    date_range = params["date-range"]
    parts = date_range.split(",")
    assert len(parts) == 2
    assert len(parts[0]) == 10 and parts[0].count("-") == 2
    assert len(parts[1]) == 10 and parts[1].count("-") == 2
    assert "T" not in date_range
    assert "Z" not in date_range
    
    # E. date range lies completely before the dataset availability boundary
    start_d = datetime.strptime(parts[0], "%Y-%m-%d").date()
    end_d = datetime.strptime(parts[1], "%Y-%m-%d").date()
    boundary_d = date(2026, 9, 10)
    assert end_d < boundary_d
    assert start_d < end_d

@pytest.mark.asyncio
@patch("app.services.gfw_ais_provider.httpx.AsyncClient")
async def test_response_parsing_and_mapping(mock_client_cls):
    """
    Verifies items F, G, H, I:
    F. Response parser correctly reads entries[0]["public-global-presence:v4.0"]
    G. vesselId maps correctly
    H. hours maps correctly
    I. exitTimestamp maps to last_observed_at
    """
    mock_client = mock_client_cls.return_value.__aenter__.return_value
    
    mock_metadata_resp = MagicMock()
    mock_metadata_resp.status_code = 200
    mock_metadata_resp.json.return_value = {"endDate": "2026-09-10T00:00:00.000Z"}
    
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_post_resp.json.return_value = {
        "status": "COMPLETED",
        "entries": [
            {
                "public-global-presence:v4.0": [
                    {
                        "vesselId": "vessel-alpha",
                        "mmsi": "341582001",
                        "shipName": "RISEN",
                        "hours": 7.2,
                        "exitTimestamp": "2026-09-08T23:00:00Z",
                        "entryTimestamp": "2026-09-08T15:48:00Z",
                        "flag": "KNA",
                        "imo": "8694182",
                        "vesselType": "OTHER"
                    }
                ]
            }
        ]
    }
    
    mock_client.get.return_value = mock_metadata_resp
    mock_client.post.return_value = mock_post_resp
    
    provider = GFWAISProvider(token="test_token")
    provider._presence_cache = {}
    
    resp = await provider.get_fleet_for_area((58.0, 24.0, 58.5, 24.5), "Gulf of Oman")
    assert resp.total == 1
    vessel = resp.vessels[0]
    
    assert vessel.id == "vessel-alpha"
    assert vessel.mmsi == "341582001"
    assert vessel.name == "RISEN"
    assert vessel.flag == "KNA"
    assert vessel.imo == "8694182"
    assert vessel.presence_hours == 7.2
    assert vessel.last_observed_at == datetime(2026, 9, 8, 23, 0, 0)
    assert vessel.presence_verified is True
    assert vessel.presence_source == "GFW 4Wings"

@pytest.mark.asyncio
@patch("app.services.gfw_ais_provider.httpx.AsyncClient")
async def test_deduplication_aggregates_hours_and_preserves_latest_timestamp(mock_client_cls):
    """
    Verifies item J:
    Duplicate presence records for the same vesselId produce exactly one FleetVessel,
    sum presence hours, and preserve latest exitTimestamp.
    """
    mock_client = mock_client_cls.return_value.__aenter__.return_value
    
    mock_metadata_resp = MagicMock()
    mock_metadata_resp.status_code = 200
    mock_metadata_resp.json.return_value = {"endDate": "2026-09-10T00:00:00.000Z"}
    
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_post_resp.json.return_value = {
        "status": "COMPLETED",
        "entries": [
            {
                "public-global-presence:v4.0": [
                    {
                        "vesselId": "vessel-dup",
                        "mmsi": "548082300",
                        "shipName": "AYEN 1",
                        "hours": 3.0,
                        "exitTimestamp": "2026-09-07T12:00:00Z"
                    },
                    {
                        "vesselId": "vessel-dup",
                        "mmsi": "548082300",
                        "shipName": "AYEN 1",
                        "hours": 4.5,
                        "exitTimestamp": "2026-09-08T18:00:00Z"
                    }
                ]
            }
        ]
    }
    
    mock_client.get.return_value = mock_metadata_resp
    mock_client.post.return_value = mock_post_resp
    
    provider = GFWAISProvider(token="test_token")
    provider._presence_cache = {}
    
    resp = await provider.get_fleet_for_area((58.0, 24.0, 58.5, 24.5), "Gulf of Oman")
    assert resp.total == 1
    assert len(resp.vessels) == 1
    
    v = resp.vessels[0]
    assert v.id == "vessel-dup"
    assert v.presence_hours == 7.5
    assert v.last_observed_at == datetime(2026, 9, 8, 18, 0, 0)

@pytest.mark.asyncio
@patch("app.services.gfw_ais_provider.httpx.AsyncClient")
async def test_identity_enrichment_does_not_create_presence(mock_client_cls):
    """
    Verifies items K, L:
    K. Identity enrichment cannot create presence by itself.
    L. Global /v3/vessels/search is never used as an area-presence source.
    """
    mock_client = mock_client_cls.return_value.__aenter__.return_value
    
    mock_metadata_resp = MagicMock()
    mock_metadata_resp.status_code = 200
    mock_metadata_resp.json.return_value = {"endDate": "2026-09-10T00:00:00.000Z"}
    
    mock_post_resp = MagicMock()
    mock_post_resp.status_code = 200
    mock_post_resp.json.return_value = {
        "status": "COMPLETED",
        "entries": [{"public-global-presence:v4.0": []}]
    }
    
    mock_client.get.return_value = mock_metadata_resp
    mock_client.post.return_value = mock_post_resp
    
    provider = GFWAISProvider(token="test_token")
    provider._presence_cache = {}
    
    with patch.object(provider, "get_vessel_identities") as mock_enrich:
        resp = await provider.get_fleet_for_area((58.0, 24.0, 58.5, 24.5), "Gulf of Oman")
        assert resp.status == "EMPTY"
        assert resp.total == 0
        mock_enrich.assert_not_called()

@pytest.mark.asyncio
@patch("app.api.v1.ais.get_monitoring_zone_repository")
@patch("app.api.v1.ais.get_investigation_repository")
@patch.object(GFWAISProvider, "get_fleet_for_area")
async def test_different_zone_ids_produce_different_aoi(mock_get_fleet, mock_inv_repo, mock_zone_repo_factory, mock_zone_repo, mock_invest_repo):
    """
    Verifies item N:
    Different zone_id values produce different AOI bounding box requests.
    """
    mock_zone_repo_factory.return_value = mock_zone_repo
    mock_inv_repo.return_value = mock_invest_repo
    mock_get_fleet.return_value = FleetResponse(status="LIVE", total=0, vessels=[])
    
    user = {"uid": "user-1"}
    
    # Request zone-1
    await get_fleet(zone_id="zone-1", limit=50, user=user)
    mock_get_fleet.assert_called_with(bbox=(50.0, 20.0, 60.0, 30.0), zone_name="Test Zone 1")
    
    # Request zone-2 (Gulf of Oman)
    await get_fleet(zone_id="zone-2", limit=50, user=user)
    mock_get_fleet.assert_called_with(bbox=(58.0, 24.0, 58.5, 24.5), zone_name="Gulf of Oman")

@pytest.mark.asyncio
@patch("app.api.v1.ais.get_monitoring_zone_repository")
async def test_invalid_zone_id_handled_honestly(mock_zone_repo_factory, mock_zone_repo):
    """
    Verifies item O:
    Missing or invalid zone_id returns explicit error rather than falling back.
    """
    mock_zone_repo_factory.return_value = mock_zone_repo
    user = {"uid": "user-1"}
    
    with pytest.raises(HTTPException) as exc:
        await get_fleet(zone_id="nonexistent-zone", limit=50, user=user)
    assert exc.value.status_code == 403

