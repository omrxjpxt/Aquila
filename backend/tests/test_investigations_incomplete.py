import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.schemas.investigation import InvestigationCreate
from app.services.repositories.factory import get_investigation_repository

client = TestClient(app)

def test_incomplete_status_when_no_candidate(monkeypatch):
    """
    Verify that when manual investigation has no candidate slick,
    it ends in INCOMPLETE status, not REPORT_READY.
    """
    from app.api.deps import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "test_operator", "email": "operator@aquila.system"}

    try:
        response = client.post("/api/v1/investigations/manual", json={
            "title": "Incomplete Audit Test",
            "bbox": [10.0, 10.0, 10.1, 10.1],
            "scene_id": None
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "INCOMPLETE", f"Expected INCOMPLETE, got {data['status']}"
        assert data["status"] != "REPORT_READY"
        assert data["anomaly_id"] is None
        assert data["anomaly_geometry"] is None

        # Verify persisted evidence
        ev_resp = client.get(f"/api/v1/investigations/{data['id']}/evidence")
        assert ev_resp.status_code == 200
        evs = ev_resp.json()
        assert any(e["event_type"] == "SLICK_CANDIDATE" and e["status"] in ["NO_CANDIDATE", "UNAVAILABLE"] for e in evs)

    finally:
        app.dependency_overrides.pop(get_current_user, None)

def test_existing_demo_investigation_remains_report_ready():
    """
    Ensure existing completed investigation INV-DEMO-OMAN-001 remains REPORT_READY.
    """
    from app.api.deps import get_current_user
    app.dependency_overrides[get_current_user] = lambda: {"uid": "test_operator", "email": "operator@aquila.system"}

    try:
        repo = get_investigation_repository()
        inv = repo.get_investigation("INV-DEMO-OMAN-001")
        if inv:
            assert inv.status == "REPORT_READY"
            assert inv.anomaly_id is not None
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_automated_completed_investigation_becomes_report_ready():
    """
    Regression Test A: Verify that when an automated monitoring job finishes
    its attribution pipeline, the associated investigation is updated to REPORT_READY
    and appears in the /reports archive.
    """
    import uuid
    from app.schemas.orchestration import MonitoringJob, JobStatus
    from app.schemas.investigation import InvestigationCreate
    from app.schemas.slick import Slick
    from app.schemas.drift import DriftResult, OriginEstimate, DriftProvenance
    from app.services.orchestrator import orchestrator
    from app.api.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {"uid": "test_operator", "email": "operator@aquila.system"}

    try:
        inv_repo = get_investigation_repository()
        job_repo = orchestrator.job_repository

        test_prod_id = f"test-prod-{uuid.uuid4().hex[:6]}"
        test_slick_id = f"cand-{uuid.uuid4().hex[:6]}"
        
        # Create initial open investigation
        inv_create = InvestigationCreate(
            title="Automated Test Pipeline Scene",
            status="OPEN",
            priority="HIGH",
            creation_mode="AUTOMATIC_MONITORING",
            owner_uid="SYSTEM",
            source_product_id=test_prod_id,
            monitoring_zone_id="zone-gulf-of-oman",
            anomaly_id=f"{test_prod_id}_{test_slick_id}",
            anomaly_geometry={"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]}
        )
        inv = inv_repo.create_investigation(inv_create)
        assert inv.status == "OPEN"

        # Create monitoring job in ATTRIBUTION state with investigation target
        job = MonitoringJob(
            product_id=test_prod_id,
            product_name="S1A_TEST_SCENE",
            monitoring_zone_id="zone-gulf-of-oman",
            owner_uid="SYSTEM",
            status=JobStatus.ATTRIBUTION,
            investigation_ids=[inv.id]
        )
        job = job_repo.create_job(job)

        dummy_slick = Slick(
            id=test_slick_id,
            source_scene_id=test_prod_id,
            detected_at=datetime.utcnow(),
            geometry={"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]},
            area_sq_km=1.5
        )

        dummy_drift = DriftResult(
            id=f"drift-{uuid.uuid4().hex[:6]}",
            scenario_id=f"scen-{uuid.uuid4().hex[:6]}",
            slick_id=test_slick_id,
            run_time=datetime.utcnow(),
            trajectories=[],
            origin_estimate=OriginEstimate(
                id=f"orig-{uuid.uuid4().hex[:6]}",
                slick_id=test_slick_id,
                scenario_id="scen-1",
                estimated_time=datetime.utcnow(),
                geometry={"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]}
            ),
            provenance=DriftProvenance(engine="OpenDrift", mode="LIVE")
        )

        # Set up orchestrator context
        ctx = orchestrator._get_context(job.job_id)
        ctx['investigation_targets'] = [{
            'investigation_id': inv.id,
            'slick': dummy_slick,
            'drift_result': dummy_drift,
            'gfw_identities': []
        }]

        # Execute attribution stage
        await orchestrator._handle_attribution(job)

        assert job.status == JobStatus.REPORT_READY

        # Verify investigation status was updated to REPORT_READY
        updated_inv = inv_repo.get_investigation(inv.id)
        assert updated_inv is not None
        assert updated_inv.status == "REPORT_READY", f"Expected REPORT_READY, got {updated_inv.status}"

        # Verify investigation now appears in reports archive
        rep_resp = client.get("/api/v1/reports")
        assert rep_resp.status_code == 200
        reports = rep_resp.json()
        matching_reports = [r for r in reports if r["investigation_id"] == inv.id]
        assert len(matching_reports) == 1
        assert matching_reports[0]["status"] == "REPORT_READY"

    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_automated_incomplete_no_candidate_does_not_become_report_ready():
    """
    Regression Test B: Verify that when a scene has no usable dark candidates,
    the automated pipeline resolves without marking any investigation REPORT_READY,
    and no spurious investigation appears in the /reports archive.
    """
    import uuid
    from app.schemas.orchestration import MonitoringJob, JobStatus
    from app.schemas.monitoring import NewSceneEvent
    from app.services.orchestrator import orchestrator
    from app.api.deps import get_current_user

    app.dependency_overrides[get_current_user] = lambda: {"uid": "test_operator", "email": "operator@aquila.system"}

    try:
        inv_repo = get_investigation_repository()
        job_repo = orchestrator.job_repository

        test_prod_id = f"test-prod-empty-{uuid.uuid4().hex[:6]}"
        event = NewSceneEvent(
            product_id=test_prod_id,
            product_name="S1A_EMPTY_SCENE",
            collection="sentinel-1-grd",
            acquisition_time=datetime.utcnow(),
            publication_time=datetime.utcnow(),
            geometry={"type": "Polygon", "coordinates": [[[58.0, 24.0], [58.1, 24.0], [58.1, 24.1], [58.0, 24.1], [58.0, 24.0]]]},
            bbox=[58.0, 24.0, 58.1, 24.1],
            monitoring_zone_id="zone-gulf-of-oman",
            discovery_source="CDSE_SUBSCRIPTION"
        )
        job = orchestrator.ingest_scene_event(event)
        assert job is not None

        # Simulate context with 0 candidates detected
        ctx = orchestrator._get_context(job.job_id)
        ctx['candidates'] = []
        job.artifact_references.append({"artifact_type": "PROCESSED_S1_RASTER", "path": "mock_path"})

        # Handle processing
        await orchestrator._handle_processing(job)

        # Pipeline correctly resolves with no candidates
        assert job.status == JobStatus.RESOLVED
        assert len(job.investigation_ids) == 0

        # Verify no automated investigation was created or marked REPORT_READY for this product
        invs = inv_repo.list_investigations()
        matching = [i for i in invs if i.source_product_id == test_prod_id]
        assert len(matching) == 0

    finally:
        app.dependency_overrides.pop(get_current_user, None)
