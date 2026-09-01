import pytest
from datetime import datetime, timezone, timedelta
from app.schemas.drift import OriginEstimate
from app.schemas.ais import VesselCandidate, AISTrack
from app.services.ais_service import AISService, MockAISProvider

@pytest.mark.asyncio
async def test_ais_gap_handling_and_filtering():
    # Setup mock origin
    dt = datetime(2026, 9, 1, 10, 0, 0, tzinfo=timezone.utc)
    origin = OriginEstimate(
        id="origin_1",
        slick_id="slick_1",
        scenario_id="scenario_1",
        estimated_time=dt,
        radius_km=5.0,
        geometry={
            "type": "Polygon",
            "coordinates": [[[0,0], [0,0.1], [0.1,0.1], [0.1,0], [0,0]]]
        }
    )
    
    provider = MockAISProvider(origin)
    service = AISService(provider)
    
    start_time = dt - timedelta(hours=12)
    end_time = dt + timedelta(hours=12)
    
    candidates = await service.discover_candidates(origin, start_time, end_time)
    
    assert len(candidates) == 1  # Only Oceanic Explorer intersects both spatially and temporally.
    
    cand = candidates[0]
    assert cand.identity.mmsi == "111111111"
    assert cand.identity.name == "OCEANIC EXPLORER"
    
    assert cand.spatially_relevant is True
    assert cand.temporally_relevant is True
    
    # Check that gap handling worked
    # We skipped i=-1, 0, 1, so the gap is from -2 to 2 (4 hours)
    assert cand.track.longest_gap_hours == 4.0
    assert cand.track.coverage_quality == "LIMITED"
    
    # Gap geometry should be populated
    assert cand.track.gap_geometry is not None
    assert len(cand.track.gap_geometry["coordinates"]) == 1 # 1 gap
    
    # Provenance
    assert cand.provenance.mode == "DEMO_MOCK"
