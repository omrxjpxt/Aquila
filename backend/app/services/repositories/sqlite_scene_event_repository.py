import json
import logging
from typing import Optional
from datetime import datetime
import sqlite3

from app.schemas.monitoring import NewSceneEvent
from app.services.repositories.db import get_db_connection
from app.services.repositories.interfaces import SceneEventRepository

logger = logging.getLogger(__name__)

class SqliteSceneEventRepository(SceneEventRepository):
    def _row_to_event(self, row: sqlite3.Row) -> NewSceneEvent:
        return NewSceneEvent(**json.loads(row['payload_json']))

    def create_event(self, event: NewSceneEvent) -> NewSceneEvent:
        with get_db_connection() as conn:
            conn.execute('''
                INSERT OR REPLACE INTO scene_events (
                    id, product_id, zone_id, owner_uid, payload_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                event.id, event.product_id, event.monitoring_zone_id, event.owner_uid,
                json.dumps(event.model_dump(mode='json')), datetime.utcnow()
            ))
        return event

    def get_event(self, event_id: str) -> Optional[NewSceneEvent]:
        with get_db_connection() as conn:
            # Fallback table check
            cursor = conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='scene_events'")
            if not cursor.fetchone():
                return None
                
            cursor = conn.execute("SELECT * FROM scene_events WHERE id = ?", (event_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_event(row)
