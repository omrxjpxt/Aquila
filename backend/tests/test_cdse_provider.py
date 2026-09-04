import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.services.cdse_service import CDSEService

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
