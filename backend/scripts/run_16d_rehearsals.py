import asyncio
import logging
import sqlite3
import os
from datetime import datetime, timedelta

from app.services.repositories.db import DB_PATH, initialize_db
from app.services.orchestrator import orchestrator, job_repository
from app.schemas.monitoring import NewSceneEvent
from app.schemas.orchestration import JobStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def reset_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    initialize_db()

async def rehearsal_1_restart():
    logger.info("=== STARTING REHEARSAL 1: RESTART ===")
    reset_db()
    
    # 1. Ingest event
    event = NewSceneEvent(
        product_id="RESTART_PROD",
        product_name="S1_TEST",
        collection="sentinel-1-grd",
        acquisition_time=datetime.utcnow(),
        publication_time=datetime.utcnow(),
        geometry={},
        bbox=(0,0,1,1),
        monitoring_zone_id="test_zone",
        discovery_source="CDSE_RECONCILIATION"
    )
    job = orchestrator.ingest_scene_event(event)
    logger.info(f"Ingested job {job.job_id}")
    
    # Claim job
    claimed_job = job_repository.claim_job(job.job_id, "worker-1", 30)
    assert claimed_job is not None
    
    # Simulate partial execution (just manually set status to PROCESSING)
    claimed_job.status = JobStatus.PROCESSING
    job_repository.update_job(claimed_job)
    logger.info(f"Worker 1 advanced job to {claimed_job.status}. CRASHING WORKER 1...")
    
    # Simulate crash by expiring the lease
    claimed_job.lease_until = datetime.utcnow() - timedelta(seconds=1)
    job_repository.update_job(claimed_job)
    
    # Restart! New worker comes online
    logger.info("Worker 2 (Restarted) coming online...")
    
    # Recovery phase
    await orchestrator.recover_stale_jobs()
    
    recovered = job_repository.get_job(job.job_id)
    assert recovered.status == JobStatus.RETRY_WAIT
    assert recovered.worker_id is None
    logger.info(f"Job successfully recovered to {recovered.status}")
    
    # Let it become QUEUED/retriable
    recovered.status = JobStatus.QUEUED
    job_repository.update_job(recovered)
    
    claimed_again = job_repository.claim_job(job.job_id, "worker-2", 30)
    assert claimed_again is not None
    assert claimed_again.worker_id == "worker-2"
    logger.info("Worker 2 claimed job and would resume processing.")
    logger.info("=== REHEARSAL 1: PASSED ===\n")

async def rehearsal_2_concurrency():
    logger.info("=== STARTING REHEARSAL 2: CONCURRENCY ===")
    reset_db()
    
    # Insert 10 identical events (idempotency check)
    event_template = NewSceneEvent(
        product_id="CONCURRENCY_PROD",
        product_name="S1_TEST",
        collection="sentinel-1-grd",
        acquisition_time=datetime.utcnow(),
        publication_time=datetime.utcnow(),
        geometry={},
        bbox=(0,0,1,1),
        monitoring_zone_id="test_zone",
        discovery_source="CDSE_RECONCILIATION"
    )
    
    for _ in range(10):
        orchestrator.ingest_scene_event(event_template)
        
    jobs = job_repository.get_jobs_by_status([JobStatus.QUEUED])
    assert len(jobs) == 1  # Deduplicated!
    logger.info("Idempotency passed. 10 events resulted in 1 job.")
    job_id = jobs[0].job_id
    
    # 3 workers try to claim at same time
    results = []
    
    async def try_claim(worker_id):
        # yield to event loop to try concurrently
        await asyncio.sleep(0.1)
        return job_repository.claim_job(job_id, worker_id, 30)
        
    tasks = [
        try_claim("worker-1"),
        try_claim("worker-2"),
        try_claim("worker-3")
    ]
    
    claims = await asyncio.gather(*tasks)
    successful_claims = [c for c in claims if c is not None]
    
    assert len(successful_claims) == 1
    logger.info(f"Concurrency passed. Only {successful_claims[0].worker_id} acquired the lease.")
    logger.info("=== REHEARSAL 2: PASSED ===\n")

async def rehearsal_3_monitoring():
    logger.info("=== STARTING REHEARSAL 3: CONTINUOUS MONITORING ===")
    # Just run the worker briefly
    from app.worker import MonitoringWorker
    from app.schemas.monitoring import MonitoringZone
    from app.services.repositories.sqlite_monitoring_zone_repository import SqliteMonitoringZoneRepository
    
    reset_db()
    
    zone_repo = SqliteMonitoringZoneRepository()
    zone = MonitoringZone(name="Rehearsal Zone", bbox=(0,0,5,5), is_enabled=True)
    zone_repo.create_zone(zone)
    
    worker = MonitoringWorker("rehearsal-daemon")
    
    logger.info("Running daemon for 1 iteration...")
    await worker._run_discovery()
    await worker._run_processing()
    
    logger.info("Daemon executed successfully.")
    logger.info("=== REHEARSAL 3: PASSED ===\n")

async def main():
    await rehearsal_1_restart()
    await rehearsal_2_concurrency()
    await rehearsal_3_monitoring()

if __name__ == "__main__":
    asyncio.run(main())
