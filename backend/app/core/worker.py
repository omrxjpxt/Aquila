import asyncio
import logging
import uuid
from app.worker import MonitoringWorker

logger = logging.getLogger(__name__)

class OrchestrationWorkerWrapper:
    """
    Compatibility wrapper for FastAPI lifespan.
    Wraps the authoritative app.worker.MonitoringWorker.
    """
    def __init__(self):
        # We assign a unique ID to the API worker to distinguish it from CLI workers
        worker_id = f"api-worker-{uuid.uuid4().hex[:8]}"
        self._monitoring_worker = MonitoringWorker(worker_id)
        self._task = None

    def start(self):
        if not self._monitoring_worker.running:
            self._task = asyncio.create_task(self._monitoring_worker.start())
            logger.info(f"OrchestrationWorker wrapper started durable worker: {self._monitoring_worker.worker_id}")

    async def stop(self):
        self._monitoring_worker.stop()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            logger.info("OrchestrationWorker wrapper stopped.")

# Singleton worker instance for FastAPI lifespan
worker = OrchestrationWorkerWrapper()
