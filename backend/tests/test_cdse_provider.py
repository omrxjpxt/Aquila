import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.services.cdse_service import CDSEService
from app.schemas.satellite import SatelliteSearchResult

client = TestClient(app)

@pytest.fixture
def cdse_service():
    service = CDSEService()
    service.client_id = "test_id"
    service.client_secret = "test_secret"
    service.token_url = "http://test-auth.local/token"
    return service

@pytest.mark.asyncio
async def test_get_access_token(cdse_service):
    with patch("app.services.cdse_service.httpx.AsyncClient.post") as mock_post:
        # Mock auth response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "fake_token",
            "expires_in": 3600
        }
        mock_post.return_value = mock_response

        token = await cdse_service._get_access_token()
        assert token == "fake_token"
        assert mock_post.call_count == 1
        
        # Test cache
        token2 = await cdse_service._get_access_token()
        assert token2 == "fake_token"
        # Should not have called post again
        assert mock_post.call_count == 1

@pytest.mark.asyncio
async def test_search_scenes(cdse_service):
    with patch("app.services.cdse_service.httpx.AsyncClient.post") as mock_post:
        def mock_post_side_effect(url, **kwargs):
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            
            if "token" in url:
                mock_resp.json.return_value = {
                    "access_token": "fake_token",
                    "expires_in": 3600
                }
            else:
                mock_resp.json.return_value = {
                    "features": [
                        {
                            "id": "S1A_IW_GRDH_1SDV_20230101T000000",
                            "bbox": [10.0, 20.0, 11.0, 21.0],
                            "geometry": {"type": "Polygon", "coordinates": [[[10,20], [11,20], [11,21], [10,21], [10,20]]]},
                            "properties": {
                                "datetime": "2023-01-01T00:00:00Z",
                                "platform": "sentinel-1a",
                                "orbit_direction": "descending",
                                "polarization": "VV,VH",
                                "instrument_mode": "IW"
                            },
                            "assets": {
                                "thumbnail": {
                                    "href": "http://test/thumb.png",
                                    "roles": ["thumbnail"]
                                }
                            }
                        }
                    ]
                }
            return mock_resp
            
        mock_post.side_effect = mock_post_side_effect
        
        bbox = (10.0, 20.0, 11.0, 21.0)
        start = datetime(2023, 1, 1)
        end = datetime(2023, 1, 2)
        
        results = await cdse_service.search_scenes(bbox, start, end)
        assert len(results) == 1
        
        scene = results[0]
        assert scene.id == "S1A_IW_GRDH_1SDV_20230101T000000"
        assert scene.source == "CDSE"
        assert scene.provenance == "LIVE"
        assert scene.platform == "sentinel-1a"
        assert scene.thumbnail_url == "http://test/thumb.png"
        assert scene.polarization == "VV,VH"

@pytest.mark.asyncio
@patch("app.services.cdse_service.httpx.AsyncClient.post")
async def test_retrieve_raster_success(mock_post, tmp_path):
    # Monkeypatch to avoid actual disk writes in test dir
    service = CDSEService()
    service._access_token = "mock-cached-token"
    service._token_expiry = datetime.now() + timedelta(hours=1)
    
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.content = b"fake_tiff_data"
    mock_post.return_value = mock_resp
    
    scene = SatelliteSearchResult(
        id="test_scene",
        source="CDSE",
        provenance="LIVE",
        collection="sentinel-1-grd",
        acquisition_time=datetime.now(),
        bbox=(0, 0, 1, 1),
        geometry={},
        polarization="VV"
    )
    
    # We expect the mock to return status 200 and some binary content
    file_path = await service.retrieve_raster(
        bbox=(0.1, 0.1, 0.2, 0.2),
        scene=scene,
        width=100,
        height=100
    )
    
    assert file_path.startswith("data/scenes/cdse_retrieval_test_scene_")
    assert file_path.endswith(".tif")
    
    # Check that the mock was called with the right process endpoint and token
    call_kwargs = mock_post.call_args[1]
    assert "https://sh.dataspace.copernicus.eu/process/v1" in mock_post.call_args[0][0]
    assert call_kwargs["headers"]["Authorization"] == "Bearer mock-cached-token"
    
    payload = call_kwargs["json"]
    assert payload["output"]["width"] == 100
    assert payload["output"]["height"] == 100
    assert payload["input"]["data"][0]["processing"]["backCoeff"] == "SIGMA0_ELLIPSOID"
    assert payload["input"]["data"][0]["processing"]["orthorectify"] is True
    assert "FLOAT32" in payload["evalscript"]

@pytest.mark.asyncio
async def test_retrieve_raster_oversized():
    service = CDSEService()
    scene = SatelliteSearchResult(
        id="test_scene",
        source="CDSE",
        provenance="LIVE",
        collection="sentinel-1-grd",
        acquisition_time=datetime.now(),
        bbox=(0, 0, 1, 1),
        geometry={},
        polarization="VV"
    )
    
    with pytest.raises(ValueError, match="too large"):
        await service.retrieve_raster(
            bbox=(0, 0, 1, 1),
            scene=scene,
            width=3000,
            height=3000
        )

def test_search_endpoint_mocked():
    # We can mock the service method directly for testing the FastAPI route
    with patch("app.api.v1.satellite.CDSEService.search_scenes") as mock_search:
        mock_search.return_value = []
        
        response = client.get(
            "/api/v1/satellite/search",
            params={
                "bbox": "10,20,11,21",
                "start_datetime": "2023-01-01T00:00:00",
                "end_datetime": "2023-01-02T00:00:00",
                "limit": 5
            }
        )
        
        assert response.status_code == 200
        assert response.json() == []
        mock_search.assert_called_once()
