import asyncio
import logging
from datetime import datetime
import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
# Force configuration modes for migration script context
settings.PERSISTENCE_BACKEND = "firestore"

# We must initialize firebase admin first
from app.core.firebase_admin import initialize_firebase_admin
initialize_firebase_admin()

from app.services.repositories.sqlite_job_repository import SqliteJobRepository
from app.services.repositories.sqlite_investigation_repository import SqliteInvestigationRepository
from app.services.repositories.sqlite_monitoring_zone_repository import SqliteMonitoringZoneRepository
from app.services.repositories.sqlite_scene_event_repository import SqliteSceneEventRepository

from app.services.repositories.firestore_job_repository import FirestoreJobRepository
from app.services.repositories.firestore_investigation_repository import FirestoreInvestigationRepository
from app.services.repositories.firestore_monitoring_zone_repository import FirestoreMonitoringZoneRepository
from app.services.repositories.firestore_scene_event_repository import FirestoreSceneEventRepository

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_zones(dry_run: bool):
    logger.info("Migrating Monitoring Zones...")
    sqlite_repo = SqliteMonitoringZoneRepository()
    
    zones = sqlite_repo.get_enabled_zones()
    for zone in zones:
        logger.info(f"  -> Migrating zone: {zone.id}")
        if not dry_run:
            import firebase_admin.firestore
            db = firebase_admin.firestore.client()
            db.collection("monitoring_zones").document(zone.id).set(zone.model_dump(mode='json'))
    logger.info(f"Migrated {len(zones)} zones.")
    return len(zones)

def migrate_investigations(dry_run: bool):
    logger.info("Migrating Investigations and Evidence...")
    sqlite_repo = SqliteInvestigationRepository()
    
    import sqlite3
    from app.services.repositories.db import get_db_connection
    from app.schemas.investigation import Investigation
    import json
    
    investigations = []
    evidence_events = []
    
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM investigations")
        for row in cursor.fetchall():
            investigations.append(sqlite_repo._row_to_investigation(row))
            
        cursor = conn.execute("SELECT * FROM evidence")
        for row in cursor.fetchall():
            evidence_events.append(sqlite_repo._row_to_evidence(row))
            
    for inv in investigations:
        logger.info(f"  -> Migrating investigation: {inv.id}")
        if not dry_run:
            import firebase_admin.firestore
            db = firebase_admin.firestore.client()
            db.collection("investigations").document(inv.id).set(inv.model_dump(mode='json'))
        
    for ev in evidence_events:
        logger.info(f"  -> Migrating evidence: {ev.id} for {ev.investigation_id}")
        if not dry_run:
            import firebase_admin.firestore
            db = firebase_admin.firestore.client()
            db.collection("investigations").document(ev.investigation_id).collection("evidence").document(ev.id).set(ev.model_dump(mode='json'))
        
    logger.info(f"Migrated {len(investigations)} investigations and {len(evidence_events)} evidence records.")
    return len(investigations), len(evidence_events)

def migrate_jobs(dry_run: bool):
    logger.info("Migrating Jobs...")
    sqlite_repo = SqliteJobRepository()
    
    import sqlite3
    from app.services.repositories.db import get_db_connection
    jobs = []
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.execute("SELECT * FROM monitoring_jobs")
        for row in cursor.fetchall():
            jobs.append(sqlite_repo._row_to_job(row))
            
    for job in jobs:
        logger.info(f"  -> Migrating job: {job.job_id}")
        if not dry_run:
            import firebase_admin.firestore
            db = firebase_admin.firestore.client()
            db.collection("monitoring_jobs").document(job.job_id).set(job.model_dump(mode='json'))
        
    logger.info(f"Migrated {len(jobs)} jobs.")
    return len(jobs)

def migrate_scene_events(dry_run: bool):
    logger.info("Migrating Scene Events...")
    import sqlite3
    from app.services.repositories.db import get_db_connection
    from app.schemas.monitoring import NewSceneEvent
    import json
    
    events = []
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        try:
            cursor = conn.execute("SELECT * FROM scene_events")
            for row in cursor.fetchall():
                events.append(NewSceneEvent.model_validate(json.loads(row['payload_json'])))
        except sqlite3.OperationalError:
            pass # Table doesn't exist
            
    for event in events:
        logger.info(f"  -> Migrating scene event: {event.id}")
        if not dry_run:
            import firebase_admin.firestore
            db = firebase_admin.firestore.client()
            db.collection("scene_events").document(event.id).set(event.model_dump(mode='json'))
        
    logger.info(f"Migrated {len(events)} scene events.")
    return len(events)


async def main():
    dry_run = "--dry-run" in sys.argv
    logger.info(f"Starting SQLite -> Firestore Migration {'[DRY RUN]' if dry_run else ''}")
    
    if os.environ.get("FIREBASE_PROJECT_ID") == "demo-aquila":
         logger.info("Using demo-aquila project. Ensure Firestore emulator is running if local.")
         
    z_count = migrate_zones(dry_run)
    e_count = migrate_scene_events(dry_run)
    j_count = migrate_jobs(dry_run)
    inv_count, ev_count = migrate_investigations(dry_run)
    
    logger.info("\n=== MIGRATION SUMMARY ===")
    logger.info(f"Mode: {'DRY RUN (No data written)' if dry_run else 'LIVE'}")
    logger.info(f"Zones migrated: {z_count}")
    logger.info(f"Scene events migrated: {e_count}")
    logger.info(f"Jobs migrated: {j_count}")
    logger.info(f"Investigations migrated: {inv_count}")
    logger.info(f"Evidence records migrated: {ev_count}")
    logger.info("=========================")

if __name__ == "__main__":
    asyncio.run(main())
