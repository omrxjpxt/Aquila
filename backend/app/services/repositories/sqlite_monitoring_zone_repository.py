import json
import logging
from typing import List, Optional
from datetime import datetime
import sqlite3

from app.schemas.monitoring import MonitoringZone
from app.services.repositories.db import get_db_connection
from app.services.repositories.interfaces import MonitoringZoneRepository

logger = logging.getLogger(__name__)

class SqliteMonitoringZoneRepository(MonitoringZoneRepository):
    def _row_to_zone(self, row: sqlite3.Row) -> MonitoringZone:
        zone = MonitoringZone(
            id=row['id'],
            name=row['name'],
            owner_uid=row['owner_uid'],
            bbox=tuple(json.loads(row['bbox_json'])),
        )
        return zone

    def create_zone(self, zone: MonitoringZone, is_demo: bool = False, is_enabled: bool = True) -> MonitoringZone:
        with get_db_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO monitoring_zones (
                    id, name, owner_uid, bbox_json, is_demo, is_enabled, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                zone.id, zone.name, zone.owner_uid, json.dumps(zone.bbox),
                is_demo, is_enabled, datetime.utcnow(), datetime.utcnow()
            ))
        return zone

    def get_zone(self, zone_id: str) -> Optional[MonitoringZone]:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM monitoring_zones WHERE id = ?", (zone_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_zone(row)

    def get_enabled_zones(self) -> List[MonitoringZone]:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM monitoring_zones WHERE is_enabled = 1")
            return [self._row_to_zone(row) for row in cursor.fetchall()]

monitoring_zone_repository = SqliteMonitoringZoneRepository()
