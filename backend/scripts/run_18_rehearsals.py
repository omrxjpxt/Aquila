import asyncio
import logging
from datetime import datetime
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.failure_policy import classify_failure, FailureClassification
from app.services.orchestrator import OrchestrationService
from app.schemas.orchestration import MonitoringJob, JobStatus
from app.schemas.monitoring import NewSceneEvent
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_failure_rehearsal():
    logger.info("=== Phase 18 Failure Injection Rehearsal ===")
    
    orchestrator = OrchestrationService()
    
    # 1. Create a job
    event = NewSceneEvent(
        product_id=f"TEST_FAILURE_{int(datetime.utcnow().timestamp())}",
        product_name="S1A_TEST",
        monitoring_zone_id="test_zone",
        publication_date=datetime.utcnow(),
        acquisition_time=datetime.utcnow(),
        publication_time=datetime.utcnow(),
        geometry={"type": "Polygon", "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]},
        bbox=[0, 0, 1, 1],
        discovery_source="OData"
    )
    job = orchestrator.ingest_scene_event(event)
    logger.info(f"Created job {job.job_id}")
    
    # 2. Inject transient failure
    import httpx
    transient_err = httpx.ConnectError("Simulated network drop")
    logger.info("Injecting TRANSIENT failure...")
    orchestrator._handle_failure(job, transient_err)
    
    assert job.status == JobStatus.RETRY_WAIT
    assert job.retry_count == 1
    assert job.next_attempt_at is not None
    assert job.worker_id is None
    logger.info(f"Transient handled correctly. Job status: {job.status}, Next attempt: {job.next_attempt_at}")
    
    # 3. Exhaust retries
    logger.info(f"Exhausting retries ({settings.WORKER_MAX_RETRIES})...")
    for _ in range(settings.WORKER_MAX_RETRIES):
        orchestrator._handle_failure(job, transient_err)
        
    assert job.status == JobStatus.FAILED
    assert job.next_attempt_at is None
    logger.info("Retry exhaustion handled correctly.")
    
    # 4. Inject permanent failure
    job.status = JobStatus.QUEUED
    job.retry_count = 0
    permanent_err = ValueError("Simulated malformed data")
    logger.info("Injecting PERMANENT failure...")
    orchestrator._handle_failure(job, permanent_err)
    
    assert job.status == JobStatus.FAILED
    assert job.next_attempt_at is None
    logger.info("Permanent failure handled correctly.")
    
    logger.info("=== Failure Injection Rehearsal SUCCESS ===")

if __name__ == "__main__":
    asyncio.run(run_failure_rehearsal())
