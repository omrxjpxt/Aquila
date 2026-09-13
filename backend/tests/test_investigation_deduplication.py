import os
import concurrent.futures
import tempfile
import logging
from app.services.repositories.sqlite_investigation_repository import SqliteInvestigationRepository
from app.schemas.investigation import InvestigationCreate
from app.services.repositories.db import initialize_db, get_db_connection

logging.basicConfig(level=logging.INFO)

def create_concurrent_inv(zone_id: str):
    # Ensure each thread gets a fresh connection via the repository
    repo = SqliteInvestigationRepository()
    inv_create = InvestigationCreate(
        title=f"Test Inv {zone_id}",
        status="OPEN",
        priority="HIGH",
        creation_mode="AUTOMATIC_MONITORING",
        owner_uid="SYSTEM",
        source_product_id="TEST_SCENE_123",
        monitoring_zone_id=zone_id,
        anomaly_id="TEST_SCENE_123_cand-abc1234",
        anomaly_geometry={"type": "Point", "coordinates": [0, 0]}
    )
    return repo.create_investigation(inv_create)

def test_deduplication_concurrency():
    # Attempt to create the exact same semantic investigation across 4 different simulated zones simultaneously
    zones = ["zone-a", "zone-b", "zone-c", "zone-d"]
    
    # ISOLATE TEST DATABASE
    fd, temp_db_path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    original_db_path = os.environ.get("AQUILA_DB_PATH")
    
    try:
        os.environ["AQUILA_DB_PATH"] = temp_db_path
        initialize_db(temp_db_path)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            results = list(executor.map(create_concurrent_inv, zones))
        
        # Verify exactly one investigation ID was returned for all 4 attempts
        unique_ids = set([inv.id for inv in results])
        assert len(unique_ids) == 1, f"Expected 1 unique investigation ID, got {len(unique_ids)}: {unique_ids}"
        
        # Query database to ensure no additional records were created
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT count(*) FROM investigations WHERE source_product_id = 'TEST_SCENE_123' AND anomaly_id = 'TEST_SCENE_123_cand-abc1234'")
            count = cursor.fetchone()[0]
            assert count == 1, f"Expected exactly 1 investigation in database, found {count}"

        print("Concurrency test PASSED on isolated DB. Invariant proven: 4 concurrent identical requests resulted in exactly 1 investigation.")
    finally:
        # Restore environment and cleanup
        if original_db_path is not None:
            os.environ["AQUILA_DB_PATH"] = original_db_path
        else:
            del os.environ["AQUILA_DB_PATH"]
        if os.path.exists(temp_db_path):
            os.unlink(temp_db_path)

if __name__ == "__main__":
    test_deduplication_concurrency()
