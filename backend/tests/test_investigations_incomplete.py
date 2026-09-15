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
