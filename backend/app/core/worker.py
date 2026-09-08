import asyncio
import logging
from datetime import datetime
from app.schemas.orchestration import JobStatus
from app.services.job_repository import job_repository
from app.services.orchestrator import orchestrator

logger = logging.getLogger(__name__)

class OrchestrationWorker:
    """
    DEMO / MVP ORCHESTRATION INFRASTRUCTURE
    
    A simple asyncio background worker that polls the InMemoryJobRepository
    for jobs in QUEUED or RETRY_WAIT states.
    
    LIMITATIONS:
    - Worker lifetime is tied to the application process.
    - No durable queue or distributed locking.
    """
    def __init__(self):
        self._running = False
        self._task = None

    def start(self):
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._poll_loop())
            logger.info("OrchestrationWorker started.")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("OrchestrationWorker stopped.")

    async def _poll_loop(self):
        while self._running:
            try:
                # 1. Process QUEUED jobs
                queued_jobs = job_repository.get_jobs_by_status([JobStatus.QUEUED])
                for job in queued_jobs:
                    # Fire and forget (or could await if we want strict sequential)
                    # For MVP, we'll await one by one to avoid overwhelming memory
                    await orchestrator.process_job(job)
                
                # 2. Process RETRY_WAIT jobs whose time has come
                retry_jobs = job_repository.get_jobs_by_status([JobStatus.RETRY_WAIT])
                now = datetime.utcnow()
                for job in retry_jobs:
                    if job.next_attempt_at and now >= job.next_attempt_at:
                        job.status = JobStatus.QUEUED
                        job_repository.update_job(job)
                        logger.info(f"Job {job.job_id} ready for retry. Moved to QUEUED.")
                        
            except Exception as e:
                logger.error(f"Error in OrchestrationWorker loop: {e}")
                
            await asyncio.sleep(5)  # Poll every 5 seconds

# Singleton worker
worker = OrchestrationWorker()
