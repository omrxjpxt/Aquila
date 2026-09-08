import asyncio
import logging
from datetime import datetime, timezone
import uuid

from app.schemas.monitoring import NewSceneEvent
from app.services.orchestrator import orchestrator
from app.services.job_repository import job_repository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Phase16CRehearsal")

async def run_rehearsal():
    logger.info("=== STARTING PHASE 16C LIVE REHEARSAL ===")

    # 1. Create a realistic NewSceneEvent (using Corsica/Sentinel-1 setup if known, otherwise a valid mock box)
    # Using a bounding box off the coast of Corsica as an example:
    event_id = str(uuid.uuid4())
    event = NewSceneEvent(
        product_id=f"cdse-corsica-demo-{event_id[:8]}",
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

    logger.info(f"Submitting NewSceneEvent: {event.product_id}")
    job = orchestrator.ingest_scene_event(event)
    
    if not job:
        logger.error("Failed to ingest scene event.")
        return

    logger.info(f"Initial Job Status: {job.status}")

    # 2. Let the worker execute the pipeline
    logger.info("Starting autonomous pipeline processing...")
    await orchestrator.process_job(job)

    # 3. Observe the final state
    logger.info("=== PIPELINE EXECUTION COMPLETE ===")
    logger.info(f"Final Job Status: {job.status}")
    logger.info(f"Retry Count: {job.retry_count}")
    logger.info(f"Last Error: {job.last_error}")
    
    logger.info("=== SCIENTIFIC RESULTS ===")
    logger.info(f"Investigations Created: {job.investigation_ids}")
    logger.info(f"Classification Results: {job.classification_results}")
    logger.info(f"Provenance References: {job.provenance_references}")

    # 4. Idempotency Test
    logger.info("=== STARTING IDEMPOTENCY TEST ===")
    logger.info("Submitting the exact same event again...")
    job2 = orchestrator.ingest_scene_event(event)
    
    logger.info(f"Job 1 ID: {job.job_id}")
    logger.info(f"Job 2 ID: {job2.job_id if job2 else 'None'}")
    if job2 and job2.job_id == job.job_id:
        logger.info("IDEMPOTENCY TEST PASSED: Duplicate event returned existing job without recreating.")
    else:
        logger.error("IDEMPOTENCY TEST FAILED: A new job was created for the same event.")

if __name__ == "__main__":
    asyncio.run(run_rehearsal())
