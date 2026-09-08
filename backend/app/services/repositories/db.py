import sqlite3
import os
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

DB_PATH = os.getenv("AQUILA_DB_PATH", "data/aquila.db")

SCHEMA = """
-- Monitoring Zones
CREATE TABLE IF NOT EXISTS monitoring_zones (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_uid TEXT NOT NULL,
    bbox_json TEXT NOT NULL,
    is_demo BOOLEAN DEFAULT 0,
    is_enabled BOOLEAN DEFAULT 1,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Scene Events
CREATE TABLE IF NOT EXISTS scene_events (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    zone_id TEXT NOT NULL,
    owner_uid TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

-- Monitoring Jobs
CREATE TABLE IF NOT EXISTS monitoring_jobs (
    job_id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    monitoring_zone_id TEXT NOT NULL,
    owner_uid TEXT NOT NULL,
    status TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    next_attempt_at TIMESTAMP,
    investigation_ids_json TEXT,
    classification_results_json TEXT,
    provenance_references_json TEXT,
    artifact_references_json TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    
    -- Claiming & Leases
    worker_id TEXT,
    claimed_at TIMESTAMP,
    lease_until TIMESTAMP
);

-- Investigations
CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    creation_mode TEXT NOT NULL,
    owner_uid TEXT NOT NULL,
    source_product_id TEXT,
    monitoring_zone_id TEXT,
    anomaly_id TEXT,
    anomaly_geometry_json TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    UNIQUE(source_product_id, monitoring_zone_id, anomaly_id)
);

-- Evidence
CREATE TABLE IF NOT EXISTS evidence (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL,
    owner_uid TEXT NOT NULL,
    evidence_type TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT NOT NULL,
    observations_json TEXT,
    artifact_reference TEXT,
    timestamp TIMESTAMP,
    provenance TEXT,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id)
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    investigation_id TEXT,
    severity TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id)
);
"""

def initialize_db(db_path: str = DB_PATH):
    """Initializes the SQLite database with WAL and schemas."""
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    
    with sqlite3.connect(db_path) as conn:
        # High concurrency pragmas
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        # 30 second busy timeout handles concurrency lock waits
        conn.execute("PRAGMA busy_timeout = 30000;")
        
        # Initialize schema
        conn.executescript(SCHEMA)
        conn.commit()
    logger.info(f"Initialized SQLite database at {db_path} with WAL mode")

@contextmanager
def get_db_connection():
    """Provides a transactional database connection."""
    conn = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
