"""
Safe cleanup/migration mechanism for duplicate monitoring investigations in aquila.db.
Preserves:
- INV-DEMO-OMAN-001 (authoritative mentor demo investigation)
- One authoritative investigation per distinct Sentinel-1 acquisition
Removes redundant development test artifacts (multiple candidate patches from single test runs).
"""

import sqlite3
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cleanup_duplicates")

DB_PATH = "backend/data/aquila.db"

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    rows = c.execute("SELECT id, title, source_product_id, anomaly_id, created_at FROM investigations").fetchall()
    logger.info(f"Total investigations before cleanup: {len(rows)}")
    
    keep_ids = set()
    delete_ids = set()
    
    # 1. Always keep INV-DEMO-OMAN-001
    keep_ids.add("INV-DEMO-OMAN-001")
    
    # 2. Group auto investigations by normalized acquisition or product
    # Datatake 00860C: E1B2 & 71D8_COG are the same acquisition (20260910T020705)
    # Datatake 00860C: A56E & 1202_COG are the same acquisition (20260910T020640)
    groups = {}
    for r in rows:
        inv_id = r["id"]
        if inv_id == "INV-DEMO-OMAN-001":
            continue
            
        title = r["title"] or ""
        # Group by slice timestamp if available in title
        if "20260910T020705" in title:
            key = "20260910T020705"
        elif "20260910T020640" in title:
            key = "20260910T020640"
        else:
            key = r["source_product_id"] or inv_id
            
        if key not in groups:
            groups[key] = []
        groups[key].append(inv_id)
        
    for key, inv_list in groups.items():
        # Keep the first one, mark the rest for safe cleanup
        primary_id = inv_list[0]
        keep_ids.add(primary_id)
        for duplicate_id in inv_list[1:]:
            delete_ids.add(duplicate_id)
            
    logger.info(f"Keeping {len(keep_ids)} investigations: {sorted(list(keep_ids))}")
    logger.info(f"Cleaning up {len(delete_ids)} development duplicate artifacts.")
    
    for del_id in delete_ids:
        c.execute("DELETE FROM evidence WHERE investigation_id = ?", (del_id,))
        c.execute("DELETE FROM investigations WHERE id = ?", (del_id,))
        
    conn.commit()
    
    remaining = c.execute("SELECT count(*) FROM investigations").fetchone()[0]
    evidence_count = c.execute("SELECT count(*) FROM evidence").fetchone()[0]
    logger.info(f"Cleanup complete. Remaining investigations: {remaining}, Evidence records: {evidence_count}")
    conn.close()

if __name__ == "__main__":
    main()
