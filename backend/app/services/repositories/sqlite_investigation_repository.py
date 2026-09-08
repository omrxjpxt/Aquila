import json
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
import sqlite3

from app.schemas.investigation import Investigation, InvestigationCreate
from app.schemas.evidence import EvidenceEvent
from app.services.repositories.db import get_db_connection
from app.services.repositories.interfaces import InvestigationRepository

logger = logging.getLogger(__name__)

class SqliteInvestigationRepository(InvestigationRepository):
    def _row_to_investigation(self, row: sqlite3.Row) -> Investigation:
        return Investigation(
            id=row['id'],
            title=row['title'],
            status=row['status'],
            priority=row['priority'],
            creation_mode=row['creation_mode'],
            owner_uid=row['owner_uid'],
            source_product_id=row['source_product_id'],
            monitoring_zone_id=row['monitoring_zone_id'],
            anomaly_id=row['anomaly_id'],
            anomaly_geometry=json.loads(row['anomaly_geometry_json']) if row['anomaly_geometry_json'] else None,
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
        
    def _row_to_evidence(self, row: sqlite3.Row) -> EvidenceEvent:
        return EvidenceEvent(
            id=row['id'],
            investigation_id=row['investigation_id'],
            owner_uid=row['owner_uid'],
            event_type=row['evidence_type'],
            source=row['source'],
            status=row['status'],
            description=row['observations_json'] or "", # Reusing observations for description
            metadata=json.loads(row['observations_json']) if row['observations_json'] else None,
            event_time=row['timestamp'],
            logged_at=row['timestamp'],
        )

    def create_investigation(self, inv_create: InvestigationCreate) -> Investigation:
        # Implementation of Amendment 3: Investigation Deduplication using source_product_id, zone_id, anomaly_id
        with get_db_connection() as conn:
            if inv_create.source_product_id and inv_create.monitoring_zone_id and inv_create.anomaly_id:
                cursor = conn.execute('''
                    SELECT * FROM investigations 
                    WHERE source_product_id = ? AND monitoring_zone_id = ? AND anomaly_id = ?
                ''', (inv_create.source_product_id, inv_create.monitoring_zone_id, inv_create.anomaly_id))
                row = cursor.fetchone()
                if row:
                    logger.info(f"Investigation for anomaly {inv_create.anomaly_id} already exists.")
                    return self._row_to_investigation(row)

            import uuid
            inv_id = f"INV-{datetime.utcnow().strftime('%Y')}-{str(uuid.uuid4())[:8].upper()}"
            now = datetime.utcnow()
            
            conn.execute('''
                INSERT INTO investigations (
                    id, title, status, priority, creation_mode, owner_uid, source_product_id,
                    monitoring_zone_id, anomaly_id, anomaly_geometry_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                inv_id, inv_create.title, inv_create.status, inv_create.priority, inv_create.creation_mode,
                inv_create.owner_uid, inv_create.source_product_id, inv_create.monitoring_zone_id, inv_create.anomaly_id,
                json.dumps(inv_create.anomaly_geometry) if inv_create.anomaly_geometry else None,
                now, now
            ))
            
            # Fetch back
            cursor = conn.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
            return self._row_to_investigation(cursor.fetchone())

    def get_investigation(self, inv_id: str) -> Optional[Investigation]:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
            row = cursor.fetchone()
            return self._row_to_investigation(row) if row else None

    def add_evidence(self, evidence: EvidenceEvent) -> EvidenceEvent:
        with get_db_connection() as conn:
            # Idempotency for evidence: avoid duplicating the same evidence type for the same investigation from the same source
            cursor = conn.execute('''
                SELECT * FROM evidence 
                WHERE investigation_id = ? AND evidence_type = ? AND source = ?
            ''', (evidence.investigation_id, evidence.event_type, evidence.source))
            row = cursor.fetchone()
            if row:
                logger.info(f"Evidence {evidence.event_type} from {evidence.source} already exists for {evidence.investigation_id}.")
                return self._row_to_evidence(row)

            conn.execute('''
                INSERT INTO evidence (
                    id, investigation_id, owner_uid, evidence_type, source, status,
                    observations_json, artifact_reference, timestamp, provenance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                evidence.id, evidence.investigation_id, evidence.owner_uid, evidence.event_type, evidence.source,
                evidence.status if hasattr(evidence, 'status') else 'OPEN',
                json.dumps(evidence.metadata, default=str) if evidence.metadata else "{}",
                evidence.artifact_reference if hasattr(evidence, 'artifact_reference') else None,
                evidence.event_time,
                evidence.provenance if hasattr(evidence, 'provenance') else None
            ))
        return evidence
        
    def get_evidence(self, investigation_id: str) -> List[EvidenceEvent]:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM evidence WHERE investigation_id = ?", (investigation_id,))
            return [self._row_to_evidence(row) for row in cursor.fetchall()]

investigation_repository = SqliteInvestigationRepository()
