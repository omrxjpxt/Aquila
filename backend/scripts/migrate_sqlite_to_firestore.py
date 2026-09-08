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

def migrate_zones():
    logger.info("Migrating Monitoring Zones...")
    sqlite_repo = SqliteMonitoringZoneRepository()
    firestore_repo = FirestoreMonitoringZoneRepository()
    
    zones = sqlite_repo.get_all_zones()
    for zone in zones:
        logger.info(f"  -> Migrating zone: {zone.id}")
        firestore_repo.create_zone(zone)
    logger.info(f"Migrated {len(zones)} zones.")

def migrate_investigations():
    logger.info("Migrating Investigations and Evidence...")
    sqlite_repo = SqliteInvestigationRepository()
    firestore_repo = FirestoreInvestigationRepository()
    
    # We don't have a get_all_investigations in sqlite_repo. We might need to write custom SQL here or just use sqlite3
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
        # Firestore Repo doesn't have direct create_investigation with full model, it has create_investigation (InvestigationCreate)
        # We need to manually set the data to keep exact IDs.
        # But wait, FirestoreInvestigationRepository.create_investigation generates the ID?
        # Actually it's best to use firebase_admin directly to preserve IDs, or bypass the create method.
        import firebase_admin.firestore
        db = firebase_admin.firestore.client()
        db.collection("investigations").document(inv.id).set(inv.model_dump(mode='json'))
        
    for ev in evidence_events:
        logger.info(f"  -> Migrating evidence: {ev.id} for {ev.investigation_id}")
        import firebase_admin.firestore
        db = firebase_admin.firestore.client()
        db.collection("investigations").document(ev.investigation_id).collection("evidence").document(ev.id).set(ev.model_dump(mode='json'))
        
    logger.info(f"Migrated {len(investigations)} investigations and {len(evidence_events)} evidence records.")

def migrate_jobs():
    logger.info("Migrating Jobs...")
    sqlite_repo = SqliteJobRepository()
    firestore_repo = FirestoreJobRepository()
    
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
        import firebase_admin.firestore
        db = firebase_admin.firestore.client()
        db.collection("monitoring_jobs").document(job.job_id).set(job.model_dump(mode='json'))
        
    logger.info(f"Migrated {len(jobs)} jobs.")

def migrate_scene_events():
    logger.info("Migrating Scene Events...")
    import sqlite3
    from app.services.repositories.db import get_db_connection
    from app.schemas.monitoring import NewSceneEvent
    import json
    
    events = []
    with get_db_connection() as conn:
        conn.row_factory = sqlite3.Row
        # check if scene_events exists
        try:
            cursor = conn.execute("SELECT * FROM scene_events")
            for row in cursor.fetchall():
                events.append(NewSceneEvent.model_validate(json.loads(row['payload_json'])))
        except sqlite3.OperationalError:
            pass # Table doesn't exist
            
    for event in events:
        logger.info(f"  -> Migrating scene event: {event.id}")
        import firebase_admin.firestore
        db = firebase_admin.firestore.client()
        db.collection("scene_events").document(event.id).set(event.model_dump(mode='json'))
        
    logger.info(f"Migrated {len(events)} scene events.")


async def main():
    logger.info("Starting SQLite -> Firestore Migration")
    
    if os.environ.get("FIREBASE_PROJECT_ID") == "demo-aquila":
         logger.info("Using demo-aquila project. Ensure Firestore emulator is running if local.")
         
    migrate_zones()
    migrate_scene_events()
    migrate_jobs()
    migrate_investigations()
    
    logger.info("Migration Complete!")

if __name__ == "__main__":
    asyncio.run(main())
