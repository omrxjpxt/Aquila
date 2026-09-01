import pytest
from datetime import datetime, timezone, timedelta

from app.schemas.drift import OriginEstimate, DriftResult, DriftScenario, DriftProvenance
from app.schemas.ais import VesselCandidate, VesselIdentity, AISTrack, AISProvenance
from app.services.attribution_service import AttributionService
from app.schemas.attribution import EvidenceStatus

def test_attribution_ranking():
    service = AttributionService()
    
    dt = datetime(2026, 9, 1, 10, 0, tzinfo=timezone.utc)
    
    origin = OriginEstimate(
        id="o1",
        slick_id="s1",
        scenario_id="sc1",
        estimated_time=dt,
        radius_km=5.0,
        geometry={"type": "Polygon", "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]}
    )
    
    drift = DriftResult(
        id="d1",
        slick_id="s1",
        scenario_id="sc1",
        run_time=dt,
        scenario=DriftScenario(
            scenario_id="sc1",
            investigation_id="inv1",
            slick_id="s1",
            start_time=dt,
            end_time=dt,
            is_backward=True
        ),
        origin_estimate=origin,
        trajectories=[],
        provenance=DriftProvenance(engine="MockDriftEngine", version="1.0", run_time=dt)
    )
    
    track = AISTrack(
        mmsi="123",
        geometry={"type": "MultiLineString", "coordinates": []},
        gap_geometry=None,
        positions=[],
        gaps=[],
        total_observations=100,
        longest_gap_hours=0.5,
        coverage_quality="GOOD"
    )
    
    cand1 = VesselCandidate(
        id="c1",
        investigation_id="inv1",
        identity=VesselIdentity(mmsi="123", name="Vessel A"),
        track=track,
        spatially_relevant=True,
        temporally_relevant=True,
        closest_approach_meters=0.0,
        inside_origin_region=True,
        provenance=AISProvenance(mode="DEMO_MOCK")
    )
    
    cand2 = VesselCandidate(
        id="c2",
        investigation_id="inv1",
        identity=VesselIdentity(mmsi="456", name="Vessel B"),
        track=track,
        spatially_relevant=False,
        temporally_relevant=False,
        closest_approach_meters=50000.0,
        inside_origin_region=False,
        provenance=AISProvenance(mode="DEMO_MOCK")
    )
    
    res = service.evaluate("inv1", origin, drift, [cand1, cand2])
    
    assert res.highest_ranked_candidate.mmsi == "123"
    
    c1_res = next(c for c in res.candidates if c.vessel_identity.mmsi == "123")
    c2_res = next(c for c in res.candidates if c.vessel_identity.mmsi == "456")
    
    assert c1_res.evidence_ranking_score > c2_res.evidence_ranking_score
    
    # Check C1 factors
    spatial_c1 = next(f for f in c1_res.factors if f.factor_name == "Spatial Compatibility")
    assert spatial_c1.status == EvidenceStatus.SUPPORTING
    
    # Check C2 factors
    spatial_c2 = next(f for f in c2_res.factors if f.factor_name == "Spatial Compatibility")
    assert spatial_c2.status == EvidenceStatus.CONTRADICTING
    
    assert c1_res.unavailable_count > 0 # Behavioural is UNAVAILABLE
    assert c1_res.neutral_count > 0 # Trajectory is NEUTRAL
