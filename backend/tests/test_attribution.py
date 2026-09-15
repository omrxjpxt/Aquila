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
    
    assert c1_res.unavailable_count > 0 # Behavioural and Trajectory are UNAVAILABLE
    assert c1_res.neutral_count == 0


def test_attribution_empty_candidates_returns_no_candidates():
    """
    Test 1: If AIS evidence is unavailable or returns 0 candidates,
    AttributionService returns an empty candidate list and None as highest candidate.
    It must never invent or fabricate a candidate.
    """
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
        origin_estimate=origin,
        trajectories=[],
        provenance=DriftProvenance(engine="OpenDrift", mode="LIVE")
    )

    res = service.evaluate("inv-no-candidates", origin, drift, [])
    assert res.candidates == []
    assert res.highest_ranked_candidate is None


def test_ais_candidates_endpoint_live_mode_without_token_returns_503(monkeypatch):
    """
    Test 2: When LIVE/GFW AIS is requested without a configured token,
    the endpoint raises 503 UNAVAILABLE. It does NOT silently fall back to MockAISProvider.
    """
    from fastapi.testclient import TestClient
    from app.main import app
    from app.core.config import settings

    monkeypatch.setattr(settings, "GFW_API_TOKEN", "")

    client = TestClient(app)
    payload = {
        "investigation_id": "test-inv-live",
        "origin": {
            "id": "orig-1",
            "slick_id": "slick-1",
            "scenario_id": "scen-1",
            "estimated_time": "2026-09-15T12:00:00Z",
            "geometry": {"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]}
        },
        "start_time": "2026-09-15T00:00:00Z",
        "end_time": "2026-09-15T23:59:59Z",
        "mode": "LIVE"
    }
    resp = client.post("/api/v1/ais/candidates", json=payload)
    assert resp.status_code == 503
    assert "UNAVAILABLE" in resp.json()["detail"]
    assert "GFW_API_TOKEN is not configured" in resp.json()["detail"]


def test_ais_candidates_endpoint_explicit_demo_mock_works():
    """
    Test 3: When DEMO_MOCK is explicitly requested, it works and is labeled DEMO_MOCK.
    """
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    payload = {
        "investigation_id": "test-inv-mock",
        "origin": {
            "id": "orig-1",
            "slick_id": "slick-1",
            "scenario_id": "scen-1",
            "estimated_time": "2026-09-15T12:00:00Z",
            "geometry": {"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]}
        },
        "start_time": "2026-09-15T00:00:00Z",
        "end_time": "2026-09-15T23:59:59Z",
        "mode": "DEMO_MOCK"
    }
    resp = client.post("/api/v1/ais/candidates", json=payload)
    assert resp.status_code == 200
    candidates = resp.json()
    assert len(candidates) > 0
    # Provenance must be DEMO_MOCK
    for c in candidates:
        assert c["provenance"]["mode"] == "DEMO_MOCK"


@pytest.mark.asyncio
async def test_orchestrator_gfw_unavailable_records_unavailable_evidence(monkeypatch):
    """
    Test 4: Orchestrator records UNAVAILABLE for both AIS_PRESENCE and ATTRIBUTION_EVALUATION
    when GFW is unconfigured, and does NOT attach any mock candidates.
    """
    import uuid
    from app.services.orchestrator import orchestrator
    from app.schemas.orchestration import MonitoringJob, JobStatus
    from app.schemas.slick import Slick

    # Ensure GFW token is None
    monkeypatch.setattr(orchestrator.gfw_provider, "token", None)

    inv_repo = orchestrator.investigation_repository
    job_repo = orchestrator.job_repository

    test_inv_id = f"INV-TEST-GFW-UNAVAIL-{uuid.uuid4().hex[:6]}"
    test_prod_id = f"test-prod-{uuid.uuid4().hex[:6]}"

    job = MonitoringJob(
        product_id=test_prod_id,
        product_name="S1A_TEST",
        monitoring_zone_id="zone-gulf-of-oman",
        owner_uid="SYSTEM",
        status=JobStatus.VESSEL_EVIDENCE,
        investigation_ids=[test_inv_id]
    )
    job = job_repo.create_job(job)

    origin = OriginEstimate(
        id=f"orig-{uuid.uuid4().hex[:6]}",
        slick_id="slick-1",
        scenario_id="scen-1",
        estimated_time=datetime.utcnow(),
        geometry={"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]}
    )
    drift = DriftResult(
        id=f"drift-{uuid.uuid4().hex[:6]}",
        slick_id="slick-1",
        scenario_id="scen-1",
        run_time=datetime.utcnow(),
        origin_estimate=origin,
        trajectories=[],
        provenance=DriftProvenance(engine="OpenDrift", mode="LIVE")
    )

    ctx = orchestrator._get_context(job.job_id)
    ctx['investigation_targets'] = [{
        'investigation_id': test_inv_id,
        'slick': Slick(id="s1", source_scene_id=test_prod_id, detected_at=datetime.utcnow(), geometry={"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]}, area_sq_km=1.0),
        'drift_result': drift
    }]

    # Run vessel evidence handling
    await orchestrator._handle_vessel_evidence(job)
    assert job.status == JobStatus.ATTRIBUTION

    # Run attribution handling
    await orchestrator._handle_attribution(job)
    assert job.status == JobStatus.REPORT_READY

    # Inspect recorded evidence
    evidence = inv_repo.get_evidence(test_inv_id)
    ais_ev = next((e for e in evidence if e.event_type == "AIS_PRESENCE"), None)
    attr_ev = next((e for e in evidence if e.event_type == "ATTRIBUTION_EVALUATION"), None)

    assert ais_ev is not None
    assert ais_ev.status == "UNAVAILABLE"

    assert attr_ev is not None
    assert attr_ev.status == "UNAVAILABLE"
    assert attr_ev.metadata["candidates"] == []
    assert attr_ev.metadata["highest_ranked_candidate"] is None

