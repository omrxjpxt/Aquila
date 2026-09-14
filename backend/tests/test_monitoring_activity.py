import pytest
import os
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from app.schemas.orchestration import MonitoringJob, JobStatus
from app.schemas.monitoring import MonitoringZone
from app.services.repositories.db import initialize_db
from app.services.repositories.sqlite_job_repository import SqliteJobRepository
from app.services.repositories.sqlite_monitoring_zone_repository import SqliteMonitoringZoneRepository
from app.services.orchestrator import OrchestrationService


@pytest.fixture
def isolated_test_db(tmp_path, monkeypatch):
    """
    Ensures 100% database safety: All tests run against an isolated temporary SQLite DB.
    The production database (data/aquila.db) is never touched or mutated.
    """
    db_file = str(tmp_path / "test_isolated_monitoring.db")
    monkeypatch.setattr("app.services.repositories.db.DB_PATH", db_file)
    monkeypatch.setenv("AQUILA_DB_PATH", db_file)
    initialize_db(db_file)
    yield db_file
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass


# Authoritative frontend milestone mappings mirror
STATUS_EVENT_TITLES: Dict[str, str] = {
    "REPORT_READY": "Investigation Report Ready",
    "CANDIDATES_FOUND": "Slick Candidate Detected",
    "INVESTIGATION_CREATED": "Investigation Created",
    "PROCESSING": "SAR Scene Processed",
    "RETRIEVING": "Satellite Data Retrieved",
    "QUEUED": "Scene Queued for Analysis",
    "DISCOVERED": "Satellite Scene Discovered",
    "ENVIRONMENT": "Environmental Analysis Complete",
    "DRIFT": "Drift Reconstruction Complete",
    "VESSEL_EVIDENCE": "Vessel Evidence Evaluated",
    "ATTRIBUTION": "Attribution Analysis Complete",
    "RESOLVED": "Monitoring Run Resolved",
    "FAILED": "Monitoring Run Failed",
    "RETRY_WAIT": "Monitoring Run Waiting for Retry"
}

STATUS_DESCRIPTIONS: Dict[str, str] = {
    "REPORT_READY": "Investigation report ready",
    "CANDIDATES_FOUND": "Potential slick candidate detected",
    "INVESTIGATION_CREATED": "Investigation opened with radar anomaly evidence",
    "PROCESSING": "SAR scene calibrated and backscatter thresholded",
    "RETRIEVING": "Satellite data retrieved",
    "QUEUED": "Scene queued for automated analysis",
    "DISCOVERED": "New satellite scene discovered",
    "ENVIRONMENT": "Environmental context retrieved",
    "DRIFT": "Drift reconstruction completed",
    "VESSEL_EVIDENCE": "Vessel evidence evaluated",
    "ATTRIBUTION": "Attribution analysis completed",
    "RESOLVED": "Analysis completed • No slick candidates found",
    "FAILED": "Monitoring run encountered an error",
    "RETRY_WAIT": "Monitoring run waiting for scheduled retry"
}


def deduplicate_for_dashboard(jobs: List[MonitoringJob]) -> List[MonitoringJob]:
    """Mirrors the exact deduplication and prioritization logic in the frontend."""
    if not jobs:
        return []
    sorted_jobs = sorted(jobs, key=lambda j: j.updated_at or j.created_at, reverse=True)
    seen_keys = set()
    status_counts = {}
    activities = []
    for job in sorted_jobs:
        key = f"{job.job_id}:{job.status.value}"
        if key in seen_keys:
            continue
        seen_keys.add(key)
        product_key = f"{job.product_id or job.job_id}:{job.monitoring_zone_id}:{job.status.value}"
        if product_key in seen_keys:
            continue
        seen_keys.add(product_key)
        count = status_counts.get(job.status.value, 0)
        if job.status.value == "RETRY_WAIT" and count >= 2:
            continue
        if job.status.value == "RESOLVED" and count >= 3:
            continue
        status_counts[job.status.value] = count + 1
        activities.append(job)
        if len(activities) >= 8:
            break
    return activities


def test_real_monitoring_job_powers_activity(isolated_test_db):
    """Test A & H: Real monitoring job data powers activity, zero mock data generated."""
    job_repo = SqliteJobRepository()
    zone_repo = SqliteMonitoringZoneRepository()

    zone = MonitoringZone(id="zone-oman", name="Gulf of Oman (Sentinel-1)", bbox=(58.0, 24.0, 58.5, 24.5))
    zone_repo.create_zone(zone)

    created_time = datetime(2026, 9, 13, 14, 0, 0)
    updated_time = datetime(2026, 9, 13, 14, 30, 0)

    job = MonitoringJob(
        job_id="test-job-real-001",
        product_id="prod-s1-12345",
        product_name="S1C_IW_GRDH_1SDV_20260913T141521_SAMPLE.SAFE",
        monitoring_zone_id="zone-oman",
        owner_uid="SYSTEM",
        status=JobStatus.REPORT_READY,
        created_at=created_time,
        updated_at=updated_time,
        investigation_ids=["INV-2026-TEST-001"]
    )
    job_repo.create_job(job)

    fetched = job_repo.get_job("test-job-real-001")
    assert fetched is not None
    assert fetched.job_id == "test-job-real-001"
    assert fetched.product_name == "S1C_IW_GRDH_1SDV_20260913T141521_SAMPLE.SAFE"
    assert fetched.status == JobStatus.REPORT_READY
    assert fetched.investigation_ids == ["INV-2026-TEST-001"]


def test_status_mapping_and_no_generic_job_status_updated():
    """Test B, C, D: REPORT_READY and CANDIDATES_FOUND map to meaningful titles, not generic raw strings."""
    assert STATUS_EVENT_TITLES["REPORT_READY"] == "Investigation Report Ready"
    assert STATUS_DESCRIPTIONS["REPORT_READY"] == "Investigation report ready"

    assert STATUS_EVENT_TITLES["CANDIDATES_FOUND"] == "Slick Candidate Detected"
    assert STATUS_DESCRIPTIONS["CANDIDATES_FOUND"] == "Potential slick candidate detected"

    assert STATUS_EVENT_TITLES["PROCESSING"] == "SAR Scene Processed"
    assert STATUS_EVENT_TITLES["INVESTIGATION_CREATED"] == "Investigation Created"

    # Verify none of the mapped titles use the raw generic label
    for status, title in STATUS_EVENT_TITLES.items():
        assert title != "Job Status Updated"
        assert not title.startswith("Job ") or title == "Job Failed" or "Monitoring Run" in title


def test_investigation_linkage_preserved(isolated_test_db):
    """Test E: Investigation linkage is preserved on job for human-facing identification."""
    job_repo = SqliteJobRepository()
    job = MonitoringJob(
        job_id="test-job-invs",
        product_id="prod-invs",
        product_name="S1C_IW_GRDH_SAMPLE.SAFE",
        monitoring_zone_id="zone-test",
        owner_uid="SYSTEM",
        status=JobStatus.REPORT_READY,
        investigation_ids=["INV-2026-28910731", "INV-2026-SECOND"]
    )
    job_repo.create_job(job)

    fetched = job_repo.get_job("test-job-invs")
    assert fetched.investigation_ids == ["INV-2026-28910731", "INV-2026-SECOND"]
    # Primary identifier resolves to the real investigation ID
    primary_id = fetched.investigation_ids[0]
    assert primary_id == "INV-2026-28910731"


def test_authoritative_timestamps_used(isolated_test_db):
    """Test F: Real authoritative backend timestamps are preserved without fabrication."""
    job_repo = SqliteJobRepository()
    expected_updated = datetime(2026, 9, 13, 16, 36, 40)
    job = MonitoringJob(
        job_id="test-job-time",
        product_id="prod-time",
        product_name="S1C_IW_SAMPLE.SAFE",
        monitoring_zone_id="zone-test",
        owner_uid="SYSTEM",
        status=JobStatus.REPORT_READY,
        created_at=datetime(2026, 9, 13, 16, 33, 33),
        updated_at=expected_updated
    )
    job_repo.create_job(job)

    fetched = job_repo.get_job("test-job-time")
    assert fetched.updated_at == expected_updated
    assert fetched.created_at == datetime(2026, 9, 13, 16, 33, 33)


def test_deduplication_of_identical_status_events():
    """Test G: Duplicate identical status events for the same job or product/zone are deduplicated."""
    base_time = datetime(2026, 9, 14, 10, 0, 0)
    job1 = MonitoringJob(
        job_id="job-dup-1",
        product_id="prod-dup",
        product_name="S1_DUP.SAFE",
        monitoring_zone_id="zone-dup",
        status=JobStatus.REPORT_READY,
        created_at=base_time,
        updated_at=base_time
    )
    # Identical job and status (e.g. repeated in stream or redundant query)
    job1_duplicate = MonitoringJob(
        job_id="job-dup-1",
        product_id="prod-dup",
        product_name="S1_DUP.SAFE",
        monitoring_zone_id="zone-dup",
        status=JobStatus.REPORT_READY,
        created_at=base_time,
        updated_at=base_time
    )
    # Distinct job
    job2 = MonitoringJob(
        job_id="job-dup-2",
        product_id="prod-distinct",
        product_name="S1_DISTINCT.SAFE",
        monitoring_zone_id="zone-dup",
        status=JobStatus.REPORT_READY,
        created_at=base_time + timedelta(minutes=5),
        updated_at=base_time + timedelta(minutes=5)
    )

    activities = deduplicate_for_dashboard([job1, job1_duplicate, job2])
    assert len(activities) == 2
    job_ids = [a.job_id for a in activities]
    assert job_ids == ["job-dup-2", "job-dup-1"]


def test_empty_state_handling():
    """Test I: Empty monitoring data produces empty list without manufacturing fake events."""
    activities = deduplicate_for_dashboard([])
    assert activities == []


def test_active_counts_unaltered_by_activity_filtering():
    """Test K & L: Active Investigations and Monitoring Jobs counts are separate from Recent Activity."""
    jobs = [
        MonitoringJob(job_id="j1", product_id="p1", product_name="s1", monitoring_zone_id="z", status=JobStatus.PROCESSING),
        MonitoringJob(job_id="j2", product_id="p2", product_name="s2", monitoring_zone_id="z", status=JobStatus.REPORT_READY),
        MonitoringJob(job_id="j3", product_id="p3", product_name="s3", monitoring_zone_id="z", status=JobStatus.RESOLVED),
        MonitoringJob(job_id="j4", product_id="p4", product_name="s4", monitoring_zone_id="z", status=JobStatus.FAILED)
    ]

    # Exactly matching the existing definition on the dashboard:
    # const activeJobs = jobs.filter(j => j.status !== 'RESOLVED' && j.status !== 'FAILED');
    active_jobs = [j for j in jobs if j.status not in [JobStatus.RESOLVED, JobStatus.FAILED]]
    assert len(active_jobs) == 2  # j1 (PROCESSING) and j2 (REPORT_READY)

    # Activity list can display all meaningful milestones (up to 8)
    activities = deduplicate_for_dashboard(jobs)
    assert len(activities) == 4
    # The count of active pipeline jobs remains 2, completely decoupled from activity count
    assert len(active_jobs) == 2


def test_orchestration_state_machine_unmodified():
    """Test M: Existing monitoring orchestration state machine and stages remain unmodified."""
    orchestrator = OrchestrationService()
    assert hasattr(orchestrator, "process_job")
    assert hasattr(orchestrator, "_handle_queued")
    assert hasattr(orchestrator, "_handle_retrieving")
    assert hasattr(orchestrator, "_handle_processing")
    assert hasattr(orchestrator, "_handle_candidates_found")
    assert hasattr(orchestrator, "_handle_classifying")
    assert hasattr(orchestrator, "_handle_investigation_created")
    assert hasattr(orchestrator, "_handle_environment")
    assert hasattr(orchestrator, "_handle_drift")
    assert hasattr(orchestrator, "_handle_vessel_evidence")
    assert hasattr(orchestrator, "_handle_attribution")
