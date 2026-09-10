import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.schemas.investigation import InvestigationCreate
from app.schemas.evidence import EvidenceEvent
from app.services.repositories.factory import get_investigation_repository
from app.services.repositories.db import get_db_connection

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_test_reports():
    """Seed test investigations for report testing in test_aquila.db."""
    from app.services.repositories.db import initialize_db
    initialize_db()
    repo = get_investigation_repository()
    
    # 1. Report-ready investigation owned by test_user_123
    inv_ready = repo.create_investigation(InvestigationCreate(
        title="Sentinel-1 SAR Oil Slick Verification Report",
        status="REPORT_READY",
        priority="HIGH",
        owner_uid="test_user_123",
        creation_mode="MANUAL"
    ))
    
    # Add evidence events to make it a genuine dossier
    ev1 = EvidenceEvent(
        id=f"EV-{inv_ready.id}-01",
        investigation_id=inv_ready.id,
        owner_uid="test_user_123",
        event_type="SATELLITE_DETECTION",
        source="Sentinel-1 SAR",
        status="COMPLETED",
        description="Slick anomaly detected",
        event_time=datetime.utcnow()
    )
    ev2 = EvidenceEvent(
        id=f"EV-{inv_ready.id}-02",
        investigation_id=inv_ready.id,
        owner_uid="test_user_123",
        event_type="ATTRIBUTION_EVALUATION",
        source="AttributionService",
        status="COMPLETED",
        description="Candidate attribution completed",
        event_time=datetime.utcnow()
    )
    repo.add_evidence(ev1)
    repo.add_evidence(ev2)

    # 2. In-progress/open investigation (should NOT appear in reports)
    inv_open = repo.create_investigation(InvestigationCreate(
        title="Unfinished Detection Pipeline",
        status="OPEN",
        priority="NORMAL",
        owner_uid="test_user_123",
        creation_mode="AUTOMATIC_MONITORING"
    ))

    # 3. Report-ready investigation owned by another user (SYSTEM or other_user)
    inv_private = repo.create_investigation(InvestigationCreate(
        title="Restricted Investigation Other Org",
        status="REPORT_READY",
        priority="CRITICAL",
        owner_uid="strictly_other_org_user",
        creation_mode="MANUAL"
    ))

    yield {
        "ready_id": inv_ready.id,
        "open_id": inv_open.id,
        "private_id": inv_private.id
    }

    # Teardown
    with get_db_connection() as conn:
        conn.execute("DELETE FROM evidence WHERE investigation_id IN (?, ?, ?)", (inv_ready.id, inv_open.id, inv_private.id))
        conn.execute("DELETE FROM investigations WHERE id IN (?, ?, ?)", (inv_ready.id, inv_open.id, inv_private.id))
        conn.commit()


def test_reports_unauthenticated():
    """Verify that /api/v1/reports requires authentication."""
    from app.api.deps import get_current_user
    override = app.dependency_overrides.pop(get_current_user, None)
    try:
        resp = client.get("/api/v1/reports")
        assert resp.status_code == 401
    finally:
        if override:
            app.dependency_overrides[get_current_user] = override


def test_reports_listing_authenticated(setup_test_reports):
    """Authenticated user receives persisted report-ready investigations."""
    ready_id = setup_test_reports["ready_id"]
    resp = client.get("/api/v1/reports", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    reports = resp.json()
    assert isinstance(reports, list)

    matching = [r for r in reports if r["id"] == ready_id]
    assert len(matching) == 1
    r = matching[0]
    assert r["status"] == "REPORT_READY"
    assert r["priority"] == "HIGH"
    assert r["evidence_count"] >= 2
    assert r["has_attribution"] is True
    assert r["provenance_mode"] == "LIVE"


def test_open_investigation_excluded_from_reports(setup_test_reports):
    """Investigations with status OPEN must NOT appear in the /reports archive."""
    open_id = setup_test_reports["open_id"]
    resp = client.get("/api/v1/reports", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    reports = resp.json()
    assert not any(r["id"] == open_id for r in reports)


def test_reports_search_by_id(setup_test_reports):
    """Search query matching partial ID filters correctly."""
    ready_id = setup_test_reports["ready_id"]
    # Search by partial ID
    query = ready_id[-6:]
    resp = client.get(f"/api/v1/reports?query={query}", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    reports = resp.json()
    assert any(r["id"] == ready_id for r in reports)

    resp_empty = client.get("/api/v1/reports?query=NONEXISTENT_ID_XYZ", headers={"Authorization": "Bearer demo-token"})
    assert resp_empty.status_code == 200
    assert len(resp_empty.json()) == 0


def test_reports_search_by_title(setup_test_reports):
    """Search query matching partial title filters correctly (case-insensitive)."""
    ready_id = setup_test_reports["ready_id"]
    resp = client.get("/api/v1/reports?query=oil+slick", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    reports = resp.json()
    assert any(r["id"] == ready_id for r in reports)


def test_reports_authorization_ownership(setup_test_reports):
    """User cannot see another private user's report."""
    private_id = setup_test_reports["private_id"]
    resp = client.get("/api/v1/reports", headers={"Authorization": "Bearer demo-token"})
    assert resp.status_code == 200
    reports = resp.json()
    # test_user_123 should NOT see strictly_other_org_user's report
    assert not any(r["id"] == private_id for r in reports)
