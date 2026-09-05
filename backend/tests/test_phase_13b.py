import pytest
import math
from datetime import datetime, timezone
from app.services.environmental_forcing import OpenMeteoForcingAdapter

class TestVectorConversion:
    def test_wind_conversion_cardinal(self):
        adapter = OpenMeteoForcingAdapter()
        s = 10.0
        
        # Wind is from the given direction.
        # 0 deg (From North) -> wind blows South -> U=0, V=-10
        u, v = adapter.convert_wind_to_uv(s, 0.0)
        assert math.isclose(u, 0.0, abs_tol=1e-9)
        assert math.isclose(v, -s, abs_tol=1e-9)
        
        # 90 deg (From East) -> wind blows West -> U=-10, V=0
        u, v = adapter.convert_wind_to_uv(s, 90.0)
        assert math.isclose(u, -s, abs_tol=1e-9)
        assert math.isclose(v, 0.0, abs_tol=1e-9)
        
        # 180 deg (From South) -> wind blows North -> U=0, V=10
        u, v = adapter.convert_wind_to_uv(s, 180.0)
        assert math.isclose(u, 0.0, abs_tol=1e-9)
        assert math.isclose(v, s, abs_tol=1e-9)
        
        # 270 deg (From West) -> wind blows East -> U=10, V=0
        u, v = adapter.convert_wind_to_uv(s, 270.0)
        assert math.isclose(u, s, abs_tol=1e-9)
        assert math.isclose(v, 0.0, abs_tol=1e-9)

    def test_current_conversion_cardinal(self):
        adapter = OpenMeteoForcingAdapter()
        s = 2.0
        
        # Current is towards the given direction.
        # 0 deg (To North) -> U=0, V=2
        u, v = adapter.convert_current_to_uv(s, 0.0)
        assert math.isclose(u, 0.0, abs_tol=1e-9)
        assert math.isclose(v, s, abs_tol=1e-9)
        
        # 90 deg (To East) -> U=2, V=0
        u, v = adapter.convert_current_to_uv(s, 90.0)
        assert math.isclose(u, s, abs_tol=1e-9)
        assert math.isclose(v, 0.0, abs_tol=1e-9)
        
        # 180 deg (To South) -> U=0, V=-2
        u, v = adapter.convert_current_to_uv(s, 180.0)
        assert math.isclose(u, 0.0, abs_tol=1e-9)
        assert math.isclose(v, -s, abs_tol=1e-9)
        
        # 270 deg (To West) -> U=-2, V=0
        u, v = adapter.convert_current_to_uv(s, 270.0)
        assert math.isclose(u, -s, abs_tol=1e-9)
        assert math.isclose(v, 0.0, abs_tol=1e-9)

    def test_null_conversion(self):
        adapter = OpenMeteoForcingAdapter()
        u, v = adapter.convert_wind_to_uv(None, 45.0)
        assert u == 0.0
        assert v == 0.0

        u, v = adapter.convert_current_to_uv(2.0, None)
        assert u == 0.0
        assert v == 0.0

@pytest.mark.asyncio
async def test_forcing_adapter_missing_data():
    # Mock httpx to simulate a scenario where not enough data is returned
    import httpx
    from unittest.mock import Mock, patch
    
    adapter = OpenMeteoForcingAdapter()
    
    mock_resp = Mock()
    mock_resp.json.return_value = {"hourly": {"time": []}}
    mock_resp.raise_for_status.return_value = None
    
    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        with pytest.raises(ValueError, match="Insufficient temporal coverage"):
            await adapter.get_forcing_window(
                center_lat=42.0,
                center_lon=9.0,
                start_time=datetime(2024, 1, 1, tzinfo=timezone.utc),
                end_time=datetime(2024, 1, 2, tzinfo=timezone.utc),
                half_width_deg=0.5,
                grid_spacing_deg=0.5
            )
