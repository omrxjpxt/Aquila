import pytest
import os
import json
from datetime import datetime, timezone

from app.services.byod_ais_provider import BYODAISProvider
from app.schemas.drift import OriginEstimate
from app.services.ais_service import AISService

@pytest.fixture
def temp_investigation_id():
    return "TEST_INV_14B"

@pytest.fixture
def cleanup_temp_file(temp_investigation_id):
    yield
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p = os.path.join(base_dir, "data", "ais_imports", f"{temp_investigation_id}_ais.json")
    if os.path.exists(p):
        os.remove(p)

def test_byod_csv_import(temp_investigation_id, cleanup_temp_file):
    csv_content = b"""mmsi,time,lat,lon,sog,cog,ship_type,name
123456789,2024-05-26T12:00:00Z,42.0,9.0,12.5,90.0,Tanker,TestShip
123456789,2024-05-26T13:00:00Z,42.0,9.1,12.5,90.0,Tanker,TestShip
"""
    result = BYODAISProvider.import_dataset(temp_investigation_id, csv_content, is_csv=True, declared_source="MarineTraffic")
    
    assert result["investigation_id"] == temp_investigation_id
    assert result["provenance"] == "USER_PROVIDED_AIS"
    assert result["declared_source"] == "MarineTraffic"
    assert result["record_count"] == 2
    assert result["vessel_count"] == 1
    assert result["validation_status"] == "SUCCESS"

def test_byod_json_import_and_aliases(temp_investigation_id, cleanup_temp_file):
    json_content = json.dumps([{
        "mmsi": 987654321,
        "timestamp": "2024-05-26T12:00:00+00:00",
        "latitude": 42.0,
        "longitude": 9.0,
        "speed": 10.0,
        "type": "Cargo"
    }]).encode("utf-8")
    
    result = BYODAISProvider.import_dataset(temp_investigation_id, json_content, is_csv=False)
    
    assert result["record_count"] == 1
    assert result["vessel_count"] == 1
    assert result["validation_status"] == "SUCCESS"

def test_byod_invalid_coordinates(temp_investigation_id, cleanup_temp_file):
    csv_content = b"""mmsi,time,lat,lon
123456789,2024-05-26T12:00:00Z,95.0,9.0
"""
    result = BYODAISProvider.import_dataset(temp_investigation_id, csv_content, is_csv=True)
    assert result["record_count"] == 0
    assert result["validation_status"] == "FAILED"
    assert "out of range" in result["errors"][0]

def test_byod_duplicate_handling(temp_investigation_id, cleanup_temp_file):
    # Same timestamp, same mmsi should be deduplicated
    csv_content = b"""mmsi,time,lat,lon
123456789,2024-05-26T12:00:00Z,42.0,9.0
123456789,2024-05-26T12:00:00Z,42.1,9.1
"""
    result = BYODAISProvider.import_dataset(temp_investigation_id, csv_content, is_csv=True)
    assert result["record_count"] == 1

@pytest.mark.asyncio
async def test_byod_provider_fetch(temp_investigation_id, cleanup_temp_file):
    csv_content = b"""mmsi,time,lat,lon
123456789,2024-05-26T12:00:00Z,42.0,9.0
123456789,2024-05-26T13:00:00Z,42.1,9.1
"""
    BYODAISProvider.import_dataset(temp_investigation_id, csv_content, is_csv=True)
    
    provider = BYODAISProvider(temp_investigation_id)
    assert provider.provenance_mode == "USER_PROVIDED_AIS"
    
    start_time = datetime(2024, 5, 26, 10, tzinfo=timezone.utc)
    end_time = datetime(2024, 5, 26, 14, tzinfo=timezone.utc)
    
    positions = await provider.fetch_raw_positions(41.0, 8.0, 43.0, 10.0, start_time, end_time)
    assert len(positions) == 2
    assert positions[0].lat == 42.0

@pytest.mark.asyncio
async def test_byod_ais_service_integration(temp_investigation_id, cleanup_temp_file):
    # Test gap preservation and track creation
    csv_content = b"""mmsi,time,lat,lon
123456789,2024-05-26T12:00:00Z,42.0,9.0
123456789,2024-05-26T13:00:00Z,42.1,9.1
123456789,2024-05-26T17:00:00Z,42.5,9.5
"""
    BYODAISProvider.import_dataset(temp_investigation_id, csv_content, is_csv=True)
    provider = BYODAISProvider(temp_investigation_id)
    service = AISService(provider)
    
    poly_coords = [[8.5, 41.5], [9.5, 41.5], [9.5, 42.5], [8.5, 42.5], [8.5, 41.5]]
    origin = OriginEstimate(
        id="test",
        scenario_id="scenario",
        slick_id="slick",
        geometry={"type": "Polygon", "coordinates": [poly_coords]},
        estimated_time=datetime(2024, 5, 26, 14, tzinfo=timezone.utc),
        confidence_score=0.9
    )
    
    cands = await service.discover_candidates(origin, datetime(2024, 5, 26, 10, tzinfo=timezone.utc), datetime(2024, 5, 26, 18, tzinfo=timezone.utc))
    assert len(cands) == 1
    cand = cands[0]
    
    assert cand.track.total_observations == 3
    assert cand.track.longest_gap_hours == 4.0
    assert len(cand.track.gaps) == 1
    assert cand.provenance.mode == "USER_PROVIDED_AIS"
