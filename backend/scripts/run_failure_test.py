import asyncio
import logging
from datetime import datetime, timezone
import uuid
import sys
from unittest.mock import patch

from app.schemas.monitoring import NewSceneEvent
from app.services.orchestrator import orchestrator
from app.schemas.orchestration import JobStatus

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Phase16CFailureTest")

async def run_failure_test():
    logger.info("=== STARTING PHASE 16C FAILURE TEST ===")

    event_id = str(uuid.uuid4())
    event = NewSceneEvent(
        product_id=f"cdse-corsica-fail-{event_id[:8]}",
        product_name="S1A_IW_GRDH_1SDV_20240510",
        collection="sentinel-1-grd",
        acquisition_time=datetime(2024, 5, 10, tzinfo=timezone.utc),
        publication_time=datetime.utcnow(),
        geometry={"type": "Polygon", "coordinates": [[[9.2, 42.2], [9.25, 42.2], [9.25, 42.25], [9.2, 42.25], [9.2, 42.2]]]},
        bbox=(9.2, 42.2, 9.25, 42.25),
        monitoring_zone_id="corsica-monitoring",
        discovery_source="CDSE_SUBSCRIPTION",
        polarization="VV",
        instrument_mode="IW"
    )

    job = orchestrator.ingest_scene_event(event)
    logger.info(f"Initial Job Status: {job.status}")

    # Patch CDSE retrieval to simulate a transient network error
    async def failing_retrieve(*args, **kwargs):
        raise RuntimeError("Controlled CDSE Retrieval Failure for test")

    with patch.object(orchestrator.cdse_service, "retrieve_raster", new=failing_retrieve):
        await orchestrator.process_job(job)

    logger.info(f"Final Job Status: {job.status}")
    logger.info(f"Retry Count: {job.retry_count}")
    logger.info(f"Last Error: {job.last_error}")

    if job.status == JobStatus.RETRY_WAIT:
        logger.info("FAILURE TEST PASSED: Job properly transitioned to RETRY_WAIT without mock fallback.")
    else:
        logger.error("FAILURE TEST FAILED: Job did not transition to RETRY_WAIT.")

if __name__ == "__main__":
    asyncio.run(run_failure_test())
