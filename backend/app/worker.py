import asyncio
import logging
from datetime import datetime, timedelta

from app.schemas.monitoring import SceneDiscoveryCheckpoint, MonitoringZone
from app.services.cdse_discovery_service import CDSEDiscoveryService
from app.services.orchestrator import orchestrator, job_repository
from app.services.repositories.sqlite_monitoring_zone_repository import monitoring_zone_repository

logger = logging.getLogger(__name__)

class MonitoringWorker:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.discovery_service = CDSEDiscoveryService()
        self.checkpoints = {}
        self.running = False
        
    async def _run_discovery(self):
        zones = monitoring_zone_repository.get_enabled_zones()
        if not zones:
            logger.info("No enabled monitoring zones found.")
            return

        for zone in zones:
            if zone.id not in self.checkpoints:
                # Default to looking back 1 day
                self.checkpoints[zone.id] = SceneDiscoveryCheckpoint(
                    last_publication_date=datetime.utcnow() - timedelta(days=1),
                    known_product_ids=[]
                )
            
            try:
                events, new_ckpt = await self.discovery_service.reconcile(self.checkpoints[zone.id], zone)
                self.checkpoints[zone.id] = new_ckpt
                
                for event in events:
                    logger.info(f"Discovered new event for {event.product_id} in {zone.name}")
                    orchestrator.ingest_scene_event(event)
            except Exception as e:
                logger.error(f"Discovery error for zone {zone.name}: {e}")

    async def _run_processing(self):
        import app.schemas.orchestration as orch_schema
        # Recover stale leases globally before processing new ones
        await orchestrator.recover_stale_jobs()
        
        # Poll for QUEUED or RETRY_WAIT jobs
        jobs = job_repository.get_jobs_by_status([orch_schema.JobStatus.QUEUED, orch_schema.JobStatus.RETRY_WAIT])
        for job in jobs:
            if job.status == orch_schema.JobStatus.RETRY_WAIT:
                if job.next_attempt_at and job.next_attempt_at > datetime.utcnow():
                    continue # Not time to retry yet
            
            # Atomic claim
            claimed_job = job_repository.claim_job(job.job_id, self.worker_id, lease_duration_seconds=300)
            if claimed_job:
                logger.info(f"Worker {self.worker_id} claimed job {claimed_job.job_id}")
                # We spawn process_job in the background or await it here.
                # In a minimal worker, we await it.
                await orchestrator.process_job(claimed_job)
                
    async def start(self, interval_seconds: int = 60):
        self.running = True
        logger.info(f"Starting Monitoring Worker {self.worker_id}")
        while self.running:
            await self._run_discovery()
            await self._run_processing()
            await asyncio.sleep(interval_seconds)

    def stop(self):
        self.running = False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    worker = MonitoringWorker("cli-worker-1")
    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
