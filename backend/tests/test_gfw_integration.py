import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
import httpx

from app.services.gfw_ais_provider import GFWAISProvider
from app.services.source_health_service import SourceHealthService
from app.schemas.ais import FleetResponse, VesselDetailResponse, GFWEvent


# 1. Valid GFW authentication & vessel search
@pytest.mark.asyncio
async def test_gfw_vessel_search_success():
    provider = GFWAISProvider(token="mock-valid-token")
    mock_response_data = {
        "total": 1,
        "entries": [{
            "id": "vessel-gfw-100",
            "mmsi": 987654321,
            "imo": 9123456,
            "shipname": "PACIFIC TITAN",
            "vesselType": "Crude Oil Tanker",
            "flag": "SGP",
            "lastPosition": {
                "lat": 24.5,
                "lon": 58.2,
                "timestamp": "2026-09-08T12:00:00Z"
            }
        }]
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = mock_response_data
        mock_get.return_value = mock_resp

        result = await provider.get_fleet(query="tanker", limit=10, offset=0)
        assert result.status == "LIVE"
        assert result.total == 1
        assert len(result.vessels) == 1
        v = result.vessels[0]
        assert v.id == "vessel-gfw-100"
        assert v.mmsi == "987654321"
        assert v.imo == "9123456"
        assert v.name == "PACIFIC TITAN"
        assert v.flag == "SGP"
        assert v.provenance.source == "Global Fishing Watch"
        assert v.provenance.mode == "LIVE"


# 2. Invalid token (401)
@pytest.mark.asyncio
async def test_gfw_invalid_token_401():
    provider = GFWAISProvider(token="invalid-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        error = httpx.HTTPStatusError("Unauthorized", request=MagicMock(), response=mock_resp)
        mock_get.side_effect = error

        result = await provider.get_fleet(query="tanker")
        assert result.status == "UNAVAILABLE"
        assert "authentication failed" in result.reason.lower()
        assert len(result.vessels) == 0


# 3. Vessel search by MMSI, IMO, and Name
@pytest.mark.asyncio
async def test_gfw_search_identifiers():
    provider = GFWAISProvider(token="mock-valid-token")
    mock_data = {
        "total": 1,
        "entries": [{"id": "v1", "mmsi": 222333444, "shipname": "NORDIC STAR", "vesselType": "Tanker"}]
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_get.return_value = mock_resp

        # Test search by MMSI
        res_mmsi = await provider.get_fleet(query="mmsi:222333444")
        assert res_mmsi.status == "LIVE"
        assert res_mmsi.vessels[0].mmsi == "222333444"

        # Test search by IMO
        res_imo = await provider.get_fleet(query="imo:9123456")
        assert res_imo.status == "LIVE"

        # Test search by name
        res_name = await provider.get_fleet(query="NORDIC STAR")
        assert res_name.status == "LIVE"


# 4. Vessel detail by MMSI
@pytest.mark.asyncio
async def test_gfw_vessel_detail():
    provider = GFWAISProvider(token="mock-valid-token")
    mock_data = {
        "total": 1,
        "entries": [{"id": "vessel-internal-xyz", "mmsi": 222333444, "shipname": "NORDIC STAR", "vesselType": "Tanker"}]
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = mock_data
        mock_get.return_value = mock_resp

        detail = await provider.get_vessel_by_mmsi("222333444")
        assert detail.status == "LIVE"
        assert detail.vessel is not None
        assert detail.vessel.name == "NORDIC STAR"
        assert detail.historical_track_available is False


# 5. Event retrieval (AIS gaps, encounters, loitering)
@pytest.mark.asyncio
async def test_gfw_event_retrieval():
    provider = GFWAISProvider(token="mock-valid-token")
    mock_events_data = {
        "entries": [
            {
                "id": "evt-gap-1",
                "type": "gap",
                "start": "2026-09-08T00:00:00Z",
                "end": "2026-09-08T02:00:00Z",
                "position": {"lat": 24.1, "lon": 58.0},
                "details": {"duration": "2 hours"}
            },
            {
                "id": "evt-enc-2",
                "type": "encounter",
                "start": "2026-09-08T03:00:00Z",
                "end": "2026-09-08T04:00:00Z",
                "position": {"lat": 24.2, "lon": 58.1}
            }
        ]
    }

    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = mock_events_data
        mock_get.return_value = mock_resp

        start = datetime(2026, 9, 8, 0, 0)
        end = datetime(2026, 9, 8, 6, 0)
        events = await provider.get_vessel_events("vessel-internal-xyz", start, end)
        assert len(events) == 2
        assert events[0].event_type == "gap"
        assert events[1].event_type == "encounter"


# 6. Pagination (limit and offset)
@pytest.mark.asyncio
async def test_gfw_pagination():
    provider = GFWAISProvider(token="mock-valid-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.raise_for_status = MagicMock()
        mock_resp.json.return_value = {"total": 50, "entries": []}
        mock_get.return_value = mock_resp

        await provider.get_fleet(query="tanker", limit=25, offset=50)
        args, kwargs = mock_get.call_args
        params = kwargs.get("params", {})
        assert params.get("limit") == 25
        assert params.get("offset") == 50


# 7. 403 Forbidden handling
@pytest.mark.asyncio
async def test_gfw_403_forbidden():
    provider = GFWAISProvider(token="mock-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock(status_code=403)
        mock_get.side_effect = httpx.HTTPStatusError("Forbidden", request=MagicMock(), response=mock_resp)

        result = await provider.get_fleet(query="tanker")
        assert result.status == "UNAVAILABLE"
        assert "access forbidden" in result.reason.lower()


# 8. 422 Validation Error handling
@pytest.mark.asyncio
async def test_gfw_422_validation_error():
    provider = GFWAISProvider(token="mock-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock(status_code=422)
        mock_get.side_effect = httpx.HTTPStatusError("Unprocessable Entity", request=MagicMock(), response=mock_resp)

        result = await provider.get_fleet(query="???")
        assert result.status == "UNAVAILABLE"
        assert "validation error" in result.reason.lower()


# 9. 429 Rate Limit handling
@pytest.mark.asyncio
async def test_gfw_429_rate_limit():
    provider = GFWAISProvider(token="mock-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock(status_code=429)
        mock_get.side_effect = httpx.HTTPStatusError("Too Many Requests", request=MagicMock(), response=mock_resp)

        result = await provider.get_fleet(query="tanker")
        assert result.status == "UNAVAILABLE"
        assert "rate limit reached" in result.reason.lower()


# 10. 5xx Server Error handling
@pytest.mark.asyncio
async def test_gfw_5xx_server_error():
    provider = GFWAISProvider(token="mock-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_resp = MagicMock(status_code=502)
        mock_get.side_effect = httpx.HTTPStatusError("Bad Gateway", request=MagicMock(), response=mock_resp)

        result = await provider.get_fleet(query="tanker")
        assert result.status == "UNAVAILABLE"
        assert "upstream server error" in result.reason.lower()


# 11. Timeout handling
@pytest.mark.asyncio
async def test_gfw_timeout():
    provider = GFWAISProvider(token="mock-token")
    with patch("httpx.AsyncClient.get") as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Timed out", request=MagicMock())

        result = await provider.get_fleet(query="tanker")
        assert result.status == "UNAVAILABLE"
        assert "timed out" in result.reason.lower()


# 12. No token behavior (clean UNAVAILABLE without mock fallback)
@pytest.mark.asyncio
async def test_gfw_no_token_behavior():
    provider = GFWAISProvider(token="")
    assert provider.is_configured is False
    res = await provider.get_fleet(query="tanker")
    assert res.status == "UNAVAILABLE"
    assert "not configured" in res.reason.lower()
    assert len(res.vessels) == 0


# 13. Source health check: live when API call succeeds
@pytest.mark.asyncio
async def test_source_health_live_when_api_succeeds():
    mock_fleet = FleetResponse(
        provider="Global Fishing Watch",
        status="LIVE",
        retrieved_at=datetime.utcnow(),
        total=1,
        vessels=[]
    )
    with patch("app.core.config.settings.GFW_API_TOKEN", "valid-test-token"), \
         patch("app.services.gfw_ais_provider.GFWAISProvider.get_fleet", return_value=mock_fleet):
        item = await SourceHealthService.check_gfw()
        assert item.status == "LIVE"
        assert item.mode == "LIVE"
        assert item.configured is True
        assert item.available is True


# 14. Source health check: UNAVAILABLE/ERROR when API call fails
@pytest.mark.asyncio
async def test_source_health_error_when_api_fails():
    mock_fleet = FleetResponse(
        provider="Global Fishing Watch",
        status="UNAVAILABLE",
        reason="Global Fishing Watch authentication failed: invalid or expired GFW_API_TOKEN",
        retrieved_at=datetime.utcnow(),
        total=0,
        vessels=[]
    )
    with patch("app.core.config.settings.GFW_API_TOKEN", "invalid-test-token"), \
         patch("app.services.gfw_ais_provider.GFWAISProvider.get_fleet", return_value=mock_fleet):
        item = await SourceHealthService.check_gfw()
        assert item.status == "UNAVAILABLE"
        assert item.configured is True
        assert item.available is False
