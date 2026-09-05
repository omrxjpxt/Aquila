import pytest
from datetime import datetime
from app.services.attribution_service import AttributionService
from app.schemas.drift import DriftResult, OriginEstimate, DriftProvenance
from app.schemas.ais import VesselCandidate, VesselIdentity, AISTrack, AISProvenance

def create_mock_drift(is_live: bool = False) -> DriftResult:
    return DriftResult(
        id="test-drift",
        scenario_id="scenario",
        slick_id="slick",
        run_time="2024-05-27T00:00:00Z",
        trajectories=[],
        provenance=DriftProvenance(
            mode="LIVE" if is_live else "DEMO_MOCK",
            engine="OceanDrift" if is_live else "Mock Engine",
            forcing_provider="Open-Meteo" if is_live else "MOCK",
            model_status="SUCCESS",
            limitations=""
        )
    )

def create_mock_candidate(mmsi: str, inside: bool = False, relevant: bool = False, gap_hours: float = 0, source: str = "LIVE") -> VesselCandidate:
    # Good coverage if gap < 1, otherwise Moderate/Poor
    quality = "GOOD" if gap_hours < 1 else ("MODERATE" if gap_hours < 4 else "POOR")
    return VesselCandidate(
        id=f"cand-{mmsi}",
        investigation_id="test",
        identity=VesselIdentity(mmsi=mmsi, imo=None, name=f"Vessel {mmsi}", vessel_type=None, flag=None),
        track=AISTrack(
            mmsi=mmsi,
            geometry={"type": "MultiLineString", "coordinates": []},
            gap_geometry=None,
            positions=[],
            gaps=[],
            total_observations=100,
            longest_gap_hours=gap_hours,
            coverage_quality=quality
        ),
        spatially_relevant=relevant or inside,
        temporally_relevant=relevant or inside,
        closest_approach_meters=0 if inside else 5000,
        inside_origin_region=inside,
        provenance=AISProvenance(source=source, mode=source, retrieval_time=datetime.utcnow().isoformat(), limitations="")
    )

def test_attribution_scoring_factors():
    service = AttributionService()
    drift = create_mock_drift(is_live=True) # Use live drift to enable drift contribution
    
    cand1 = create_mock_candidate("111", inside=True, gap_hours=0)
    cand2 = create_mock_candidate("222", inside=False, relevant=True, gap_hours=2) # Gap causes UNAVAILABLE AIS
    cand3 = create_mock_candidate("333", inside=False, relevant=False, gap_hours=0)

    res = service.evaluate("inv1", None, drift, [cand1, cand2, cand3])

    assert len(res.candidates) == 3
    
    # cand1: Spatial(Inside=+2), Temporal(Rel=+2), Trajectory(0), Drift(Live+Rel=+2), Behaviour(0), AIS(Good=+2) = +8
    c1 = next(c for c in res.candidates if c.vessel_identity.mmsi == "111")
    assert c1.evidence_ranking_score == 8
    assert c1.supporting_count == 4
    assert c1.unavailable_count == 2
    
    # cand2: Spatial(Rel=0), Temporal(Rel=+2), Traj(0), Drift(Live+Rel=+2), Behav(0), AIS(Gap=0) = +4
    c2 = next(c for c in res.candidates if c.vessel_identity.mmsi == "222")
    assert c2.evidence_ranking_score == 4
    assert c2.supporting_count == 2
    assert c2.neutral_count == 1
    assert c2.unavailable_count == 3
    # Check that AIS Gap is UNAVAILABLE, not CONTRADICTING
    ais_factor = next(f for f in c2.factors if f.factor_name == "AIS Data Quality")
    assert ais_factor.status == "UNAVAILABLE"

    # cand3: Spatial(NotRel=-2), Temporal(NotRel=-2), Traj(0), Drift(Live+NotRel=-2), Behav(0), AIS(Good=+2) = -4
    c3 = next(c for c in res.candidates if c.vessel_identity.mmsi == "333")
    assert c3.evidence_ranking_score == -4

def test_drift_provenance_handling():
    service = AttributionService()
    drift_mock = create_mock_drift(is_live=False)
    drift_live = create_mock_drift(is_live=True)
    
    cand = create_mock_candidate("111", inside=True)
    
    # With Mock drift, drift score should be UNAVAILABLE (0)
    res_mock = service.evaluate("inv1", None, drift_mock, [cand])
    c_mock = res_mock.candidates[0]
    drift_factor_mock = next(f for f in c_mock.factors if f.factor_name == "Drift Compatibility")
    assert drift_factor_mock.status == "UNAVAILABLE"
    
    # With Live drift, drift score should be SUPPORTING (+2)
    res_live = service.evaluate("inv1", None, drift_live, [cand])
    c_live = res_live.candidates[0]
    drift_factor_live = next(f for f in c_live.factors if f.factor_name == "Drift Compatibility")
    assert drift_factor_live.status == "SUPPORTING"

def test_tie_handling_deterministic_ordering():
    service = AttributionService()
    drift = create_mock_drift(is_live=True)
    
    # Create two identical candidates (same score), should be sorted by MMSI ascending
    cand1 = create_mock_candidate("999", inside=True)
    cand2 = create_mock_candidate("111", inside=True)
    
    res = service.evaluate("inv1", None, drift, [cand1, cand2])
    
    assert res.candidates[0].vessel_identity.mmsi == "111"
    assert res.candidates[1].vessel_identity.mmsi == "999"
    assert res.candidates[0].evidence_ranking_score == res.candidates[1].evidence_ranking_score
