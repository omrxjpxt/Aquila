import asyncio
import logging
from datetime import datetime, timedelta

from app.schemas.monitoring import SceneDiscoveryCheckpoint, MonitoringZone
from app.services.cdse_discovery_service import CDSEDiscoveryService
from app.services.orchestrator import orchestrator
from app.services.repositories.factory import get_monitoring_zone_repository, get_job_repository
from app.core.config import settings

logger = logging.getLogger(__name__)

class MonitoringWorker:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.discovery_service = CDSEDiscoveryService()
        self.monitoring_zone_repository = get_monitoring_zone_repository()
        self.job_repository = get_job_repository()
        self.checkpoints = {}
        self.shutdown_event = asyncio.Event()
        self.poll_interval = settings.WORKER_POLL_INTERVAL_SECONDS
        self.lease_duration = settings.WORKER_LEASE_DURATION_SECONDS
        
    async def _run_discovery(self):
        zones = self.monitoring_zone_repository.get_enabled_zones()
        if not zones:
            logger.info("No enabled monitoring zones found.", extra={"structured_data": {"event": "DISCOVERY_SKIP_NO_ZONES"}})
            return

        for zone in zones:
            if self.shutdown_event.is_set():
                break

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
                    logger.info(f"Discovered new event for {event.product_id} in {zone.name}", 
                                extra={"structured_data": {
                                    "event": "SCENE_DISCOVERED", 
                                    "product_id": event.product_id, 
                                    "monitoring_zone_id": zone.id
                                }})
                    orchestrator.ingest_scene_event(event)
            except Exception as e:
                logger.error(f"Discovery error for zone {zone.name}: {e}", 
                             extra={"structured_data": {"event": "DISCOVERY_ERROR", "monitoring_zone_id": zone.id}},
                             exc_info=True)

    async def _run_processing(self):
        import app.schemas.orchestration as orch_schema
        # Recover stale leases globally before processing new ones
        await orchestrator.recover_stale_jobs()
        
        # Poll for QUEUED or RETRY_WAIT jobs
        jobs = self.job_repository.get_jobs_by_status([orch_schema.JobStatus.QUEUED, orch_schema.JobStatus.RETRY_WAIT])
        for job in jobs:
            if self.shutdown_event.is_set():
                break

            if job.status == orch_schema.JobStatus.RETRY_WAIT:
                if job.next_attempt_at and job.next_attempt_at > datetime.utcnow():
                    continue # Not time to retry yet
            
            # Atomic claim
            claimed_job = self.job_repository.claim_job(job.job_id, self.worker_id, lease_duration_seconds=self.lease_duration)
            if claimed_job:
                logger.info(f"Worker {self.worker_id} claimed job {claimed_job.job_id}",
                            extra={"structured_data": {
                                "event": "JOB_CLAIMED", 
                                "job_id": claimed_job.job_id,
                                "worker_id": self.worker_id,
                                "product_id": claimed_job.product_id
                            }})
                # We spawn process_job in the background or await it here.
                # In a minimal worker, we await it to process sequentially or could use tasks.
                # Awaiting allows for safe graceful shutdown.
                await orchestrator.process_job(claimed_job)
                
    async def start(self):
        self.shutdown_event.clear()
        logger.info(f"Starting Monitoring Worker {self.worker_id}", 
                    extra={"structured_data": {"event": "WORKER_START", "worker_id": self.worker_id}})
        
        while not self.shutdown_event.is_set():
            await self._run_discovery()
            if not self.shutdown_event.is_set():
                await self._run_processing()
            
            # Sleep in small increments to allow responsive shutdown
            try:
                await asyncio.wait_for(self.shutdown_event.wait(), timeout=self.poll_interval)
            except asyncio.TimeoutError:
                pass # Expected timeout, loop continues

        logger.info(f"Monitoring Worker {self.worker_id} cleanly shut down.", 
                    extra={"structured_data": {"event": "WORKER_STOP", "worker_id": self.worker_id}})

    def stop(self):
        logger.info(f"Stop signal received for Monitoring Worker {self.worker_id}")
        self.shutdown_event.set()

if __name__ == "__main__":
    from app.core.logging_config import setup_logging
    setup_logging()
    
    worker = MonitoringWorker("cli-worker-1")
    try:
        asyncio.run(worker.start())
    except KeyboardInterrupt:
        worker.stop()
        logger.info("Worker stopped by user.")
