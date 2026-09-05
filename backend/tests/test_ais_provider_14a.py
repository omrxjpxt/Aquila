import sys
import os
import pytest
import json
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.probe_ais_14a import RealAISProvider
from app.schemas.ais import AISPosition, VesselIdentity

@pytest.fixture
def provider():
    # Force no API key for pure mocking/parser tests
    with patch.dict(os.environ, clear=True):
        return RealAISProvider(provider_name="TestAPI")

@pytest.mark.asyncio
async def test_parse_valid_positions(provider):
    mock_json = {
        "status": "success",
        "data": [
            {"mmsi": 12345, "timestamp": "2024-05-27T16:00:00Z", "longitude": 9.55, "latitude": 42.20, "speed": 12.5, "heading": 90.0}
        ]
    }
    
    positions = provider._parse_positions(mock_json)
    assert len(positions) == 1
    p = positions[0]
    assert getattr(p, "mmsi") == "12345"
    assert p.lon == 9.55
    assert p.lat == 42.20
    assert p.speed_knots == 12.5
    assert p.heading == 90.0
    assert p.timestamp.tzinfo == timezone.utc
    assert p.timestamp.hour == 16

@pytest.mark.asyncio
async def test_parse_missing_fields(provider):
    # Missing speed, heading, mmsi
    mock_json = {
        "status": "success",
        "data": [
            {"timestamp": "2024-05-26T18:00:00Z", "longitude": 9.55, "latitude": 42.20}
        ]
    }
    positions = provider._parse_positions(mock_json)
    assert len(positions) == 1
    p = positions[0]
    assert getattr(p, "mmsi") == ""
    assert p.speed_knots == 0.0
    assert p.heading == 0.0

@pytest.mark.asyncio
async def test_parse_malformed_date(provider):
    mock_json = {
        "status": "success",
        "data": [
            {"mmsi": 12345, "timestamp": "invalid_date", "longitude": 9.55, "latitude": 42.20}
        ]
    }
    # Should catch exception and skip
    positions = provider._parse_positions(mock_json)
    assert len(positions) == 0

@pytest.mark.asyncio
async def test_parse_empty_result(provider):
    mock_json = {"status": "success", "data": []}
    positions = provider._parse_positions(mock_json)
    assert len(positions) == 0
    
    mock_json_no_data = {"status": "error"}
    positions = provider._parse_positions(mock_json_no_data)
    assert len(positions) == 0

@pytest.mark.asyncio
async def test_parse_identities(provider):
    mock_json = {
        "status": "success",
        "data": [
            {"mmsi": 12345, "imo": 91234, "name": "TEST", "type": "Cargo", "flag": "PA"}
        ]
    }
    identities = provider._parse_identities(mock_json)
    assert len(identities) == 1
    i = identities[0]
    assert i.mmsi == "12345"
    assert getattr(i, "imo", None) == "91234"
    assert i.name == "TEST"
    assert i.vessel_type == "Cargo"
    assert i.flag == "PA"

@pytest.mark.asyncio
async def test_fetch_fallback_to_mock_when_no_api_key(provider):
    # Ensure it sets _used_mock_response correctly
    start_time = datetime.now(timezone.utc)
    end_time = datetime.now(timezone.utc)
    _positions = await provider.fetch_raw_positions(40.0, 9.0, 43.0, 10.0, start_time, end_time)
    assert provider._used_mock_response is True
    assert len(_positions) > 0  # From the mock method

@pytest.mark.asyncio
async def test_fetch_uses_api_when_key_present():
    with patch.dict(os.environ, {"AIS_API_KEY": "fake_key"}):
        provider = RealAISProvider()
        start_time = datetime.now(timezone.utc)
        end_time = datetime.now(timezone.utc)
        _positions = await provider.fetch_raw_positions(40.0, 9.0, 43.0, 10.0, start_time, end_time)
        assert provider._used_mock_response is False
