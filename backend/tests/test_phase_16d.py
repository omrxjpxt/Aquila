import pytest
import os
import sqlite3
from datetime import datetime, timedelta
import asyncio

from app.schemas.monitoring import MonitoringZone
from app.schemas.orchestration import MonitoringJob, JobStatus
from app.services.repositories.db import initialize_db, DB_PATH
from app.services.repositories.sqlite_job_repository import SqliteJobRepository
from app.services.repositories.sqlite_monitoring_zone_repository import SqliteMonitoringZoneRepository
from app.services.repositories.sqlite_investigation_repository import SqliteInvestigationRepository
from app.schemas.investigation import InvestigationCreate
from app.schemas.evidence import EvidenceEvent

TEST_DB_PATH = "data/test_aquila.db"

# Setup clean DB for tests
@pytest.fixture(autouse=True)
def clean_db(monkeypatch):
    monkeypatch.setattr("app.services.repositories.db.DB_PATH", TEST_DB_PATH)
    if os.path.exists(TEST_DB_PATH):
        os.remove(TEST_DB_PATH)
    initialize_db(TEST_DB_PATH)
    conn = sqlite3.connect(TEST_DB_PATH)
    conn.execute("DELETE FROM evidence")
    conn.execute("DELETE FROM investigations")
    conn.execute("DELETE FROM monitoring_jobs")
    conn.execute("DELETE FROM scene_events")
    conn.execute("DELETE FROM monitoring_zones")
    conn.commit()
    conn.close()
    yield
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

def test_sqlite_initializes():
    assert os.path.exists(TEST_DB_PATH)
    conn = sqlite3.connect(TEST_DB_PATH)
    cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()
    assert "monitoring_jobs" in tables
    assert "investigations" in tables

def test_monitoring_zone_survives():
    repo1 = SqliteMonitoringZoneRepository()
    zone = MonitoringZone(name="Test Zone", bbox=(0, 0, 1, 1))
    repo1.create_zone(zone)
    
    # Simulate restart by using a new repo instance
    repo2 = SqliteMonitoringZoneRepository()
    recovered = repo2.get_zone(zone.id)
    assert recovered is not None
    assert recovered.name == "Test Zone"

def test_monitoring_job_survives():
    repo1 = SqliteJobRepository()
    job = MonitoringJob(product_id="prod1", product_name="Name1", monitoring_zone_id="zone1")
    repo1.create_job(job)
    
    repo2 = SqliteJobRepository()
    recovered = repo2.get_job(job.job_id)
    assert recovered is not None
    assert recovered.product_id == "prod1"

def test_idempotency_duplicate_event_rejected():
    repo = SqliteJobRepository()
    job1 = MonitoringJob(product_id="prod_idem", product_name="N1", monitoring_zone_id="zone_idem")
    created1 = repo.create_job(job1)
    
    job2 = MonitoringJob(product_id="prod_idem", product_name="N1", monitoring_zone_id="zone_idem")
    created2 = repo.create_job(job2)
    
    assert created1.job_id == created2.job_id

def test_valid_lease_prevents_duplicate_claiming():
    repo = SqliteJobRepository()
    job = MonitoringJob(product_id="prod_lease", product_name="N1", monitoring_zone_id="zone_lease", status=JobStatus.QUEUED)
    repo.create_job(job)
    
    claimed = repo.claim_job(job.job_id, worker_id="worker-1", lease_duration_seconds=60)
    assert claimed is not None
    assert claimed.worker_id == "worker-1"
    
    claimed2 = repo.claim_job(job.job_id, worker_id="worker-2", lease_duration_seconds=60)
    assert claimed2 is None  # Second claim fails due to active lease

def test_expired_lease_can_be_recovered():
    repo = SqliteJobRepository()
    job = MonitoringJob(product_id="prod_expire", product_name="N1", monitoring_zone_id="zone_expire", status=JobStatus.QUEUED)
    job = repo.create_job(job)
    
    # Claim with -1 second lease to make it instantly expire
    claimed = repo.claim_job(job.job_id, worker_id="worker-1", lease_duration_seconds=-1)
    assert claimed is not None
    
    # We simulate the worker recovering stale jobs
    stale = repo.get_stale_jobs()
    assert len(stale) == 0 # queued isn't stale, must be processing
    
    # Let's set it to processing and expire lease
    claimed.status = JobStatus.PROCESSING
    claimed.lease_until = datetime.utcnow() - timedelta(seconds=1)
    repo.update_job(claimed)
    
    stale = repo.get_stale_jobs()
    assert len(stale) == 1
    assert stale[0].job_id == job.job_id

def test_investigation_deduplication():
    repo = SqliteInvestigationRepository()
    inv_create = InvestigationCreate(
        title="Test", status="OPEN", priority="HIGH", creation_mode="AUTO",
        source_product_id="prod1", monitoring_zone_id="zone1", anomaly_id="anom1"
    )
    inv1 = repo.create_investigation(inv_create)
    inv2 = repo.create_investigation(inv_create)
    
    assert inv1.id == inv2.id

def test_evidence_survives():
    repo = SqliteInvestigationRepository()
    inv_create = InvestigationCreate(
        title="Test", status="OPEN", priority="HIGH", creation_mode="AUTO",
        source_product_id="prod_ev", monitoring_zone_id="zone_ev", anomaly_id="anom_ev"
    )
    inv = repo.create_investigation(inv_create)
    
    ev = EvidenceEvent(id="ev1", investigation_id=inv.id, event_type="TEST", source="Test", description="Test", event_time=datetime.utcnow())
    repo.add_evidence(ev)
    
    repo2 = SqliteInvestigationRepository()
    evs = repo2.get_evidence(inv.id)
    assert len(evs) == 1
    assert evs[0].id == "ev1"
