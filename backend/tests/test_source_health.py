import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.source_health_service import SourceHealthService

client = TestClient(app)


def test_status_endpoint_structure():
    """Verify GET /api/v1/status returns standard structure with sources and providers."""
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "online"
    assert "service" in data
    assert "persistence" in data
    assert "providers" in data
    assert "sources" in data
    
    # Check all 6 expected intelligence sources are present
    expected_keys = {"cdse", "firebase", "gfw", "open_meteo", "opendrift", "ml_model"}
    assert set(data["sources"].keys()) == expected_keys
    assert set(data["providers"].keys()) == expected_keys


def test_no_credentials_leaked():
    """Ensure no API keys, client secrets, or OAuth tokens leak into the status response."""
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    content = response.text
    
    from app.core.config import settings
    if settings.CDSE_CLIENT_SECRET:
        assert settings.CDSE_CLIENT_SECRET not in content
    if settings.GFW_API_TOKEN:
        assert settings.GFW_API_TOKEN not in content


@pytest.mark.asyncio
async def test_gfw_missing_token_reports_unavailable_not_error():
    """When GFW_API_TOKEN is not configured, status must be UNAVAILABLE, not ERROR."""
    with patch("app.core.config.settings.GFW_API_TOKEN", ""):
        item = await SourceHealthService.check_gfw()
        assert item.id == "gfw"
        assert item.status == "UNAVAILABLE"
        assert item.mode == "UNAVAILABLE"
        assert item.configured is False
        assert item.available is False
        assert "not configured" in item.reason.lower()


@pytest.mark.asyncio
async def test_gfw_configured_token_reports_live():
    """When GFW_API_TOKEN is configured and passes lightweight check, status is LIVE."""
    from app.schemas.ais import FleetResponse
    mock_fleet = FleetResponse(status="LIVE", total=0, limit=1, offset=0, vessels=[], query="test")
    with patch("app.core.config.settings.GFW_API_TOKEN", "valid-test-token"), \
         patch("app.services.gfw_ais_provider.GFWAISProvider.get_fleet", return_value=mock_fleet):
        item = await SourceHealthService.check_gfw()
        assert item.status == "LIVE"
        assert item.configured is True
        assert item.available is True


@pytest.mark.asyncio
async def test_cdse_configured_and_token_acquired():
    """When CDSE credentials are valid, status is LIVE."""
    with patch("app.services.cdse_service.CDSEService._get_access_token", return_value="mock_valid_token"):
        item = await SourceHealthService.check_cdse()
        assert item.id == "cdse"
        assert item.status == "LIVE"
        assert item.mode == "LIVE"
        assert item.configured is True
        assert item.available is True
        assert "token acquired" in item.reason.lower()


@pytest.mark.asyncio
async def test_cdse_missing_credentials():
    """When CDSE credentials are missing, status is UNAVAILABLE, not ERROR."""
    with patch("app.core.config.settings.CDSE_CLIENT_ID", ""), \
         patch("app.core.config.settings.CDSE_CLIENT_SECRET", ""):
        item = await SourceHealthService.check_cdse()
        assert item.status == "UNAVAILABLE"
        assert item.configured is False
        assert item.available is False


@pytest.mark.asyncio
async def test_cdse_oauth_failure_reports_error():
    """When CDSE credentials exist but token acquisition throws, status is ERROR."""
    with patch("app.core.config.settings.CDSE_CLIENT_ID", "test-client-id"), \
         patch("app.core.config.settings.CDSE_CLIENT_SECRET", "test-client-secret"), \
         patch("app.services.cdse_service.CDSEService._get_access_token", side_effect=RuntimeError("OAuth endpoint 500")):
        item = await SourceHealthService.check_cdse()
        assert item.status == "ERROR"
        assert item.available is False
        assert "OAuth endpoint 500" in item.reason


@pytest.mark.asyncio
async def test_firebase_service_live():
    """When Firebase is initialized, status is LIVE / READY."""
    with patch("app.core.firebase_admin.initialize_firebase_admin", return_value=MagicMock()):
        item = await SourceHealthService.check_firebase()
        assert item.id == "firebase"
        assert item.status == "LIVE"
        assert item.mode == "LIVE"
        assert item.configured is True
        assert item.available is True


@pytest.mark.asyncio
async def test_open_meteo_live_request():
    """When Open-Meteo endpoint responds 200, status is LIVE."""
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        item = await SourceHealthService.check_open_meteo()
        assert item.id == "open_meteo"
        assert item.status == "LIVE"
        assert item.available is True
        assert item.configured is True


@pytest.mark.asyncio
async def test_open_meteo_failure_reports_error():
    """When Open-Meteo endpoint is unreachable, status is ERROR."""
    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection refused")):
        item = await SourceHealthService.check_open_meteo()
        assert item.status == "ERROR"
        assert item.available is False
        assert "Connection refused" in item.reason


@pytest.mark.asyncio
async def test_opendrift_local_readiness():
    """OpenDrift is a local scientific dependency, reports READY and mode LOCAL."""
    item = await SourceHealthService.check_opendrift()
    assert item.id == "opendrift"
    assert item.status == "READY"
    assert item.mode == "LOCAL"
    assert item.available is True
    assert item.configured is True
    assert "opendrift" in item.reason.lower()


@pytest.mark.asyncio
async def test_ml_model_artifact_readiness():
    """ML model artifact verification reports READY and mode LOCAL for real-data-trained SVM."""
    item = await SourceHealthService.check_ml_model()
    assert item.id == "ml_model"
    assert item.status == "READY"
    assert item.mode == "LOCAL"
    assert item.available is True
    assert "lookalike_svm_real_v1" in item.reason


@pytest.mark.asyncio
async def test_ml_model_missing_reports_error():
    """If ML model artifact is missing, reports ERROR."""
    with patch("os.path.exists", return_value=False):
        item = await SourceHealthService.check_ml_model()
        assert item.status == "ERROR"
        assert item.available is False
        assert "not found" in item.reason.lower()


@pytest.mark.asyncio
async def test_independent_source_failures():
    """A failure in one provider must not cause other providers to report ERROR."""
    with patch.object(SourceHealthService, "check_open_meteo") as mock_meteo:
        mock_meteo.side_effect = Exception("Isolated network fault")
        
        status_resp = await SourceHealthService.get_system_status()
        
        assert status_resp.sources["open_meteo"].status == "ERROR"
        # Others must still report their independent states
        assert status_resp.sources["opendrift"].status == "READY"
        assert status_resp.sources["ml_model"].status == "READY"
        assert status_resp.sources["gfw"].status == "UNAVAILABLE"


def test_no_mock_fallback_in_production():
    """Ensure that live sources do not silently report DEMO_MOCK."""
    response = client.get("/api/v1/status")
    data = response.json()
    for src_id, src in data["sources"].items():
        assert src["status"] != "DEMO_MOCK", f"Source {src_id} unexpectedly in DEMO_MOCK state"
