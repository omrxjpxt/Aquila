import json
import logging
from typing import Optional, List
from app.schemas.satellite import SatelliteScene
from app.services.repositories.interfaces import SceneRepository
from app.services.repositories.db import get_db_connection

logger = logging.getLogger(__name__)

class SqliteSceneRepository(SceneRepository):
    def __init__(self):
        self._init_db()

    def _init_db(self):
        with get_db_connection() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS scenes (
                    id TEXT PRIMARY KEY,
                    acquisition_time TEXT NOT NULL,
                    is_processed INTEGER DEFAULT 0,
                    data TEXT NOT NULL
                )
            ''')
            conn.commit()

    def save_scene(self, scene: SatelliteScene) -> SatelliteScene:
        try:
            with get_db_connection() as conn:
                conn.execute('''
                    INSERT INTO scenes (id, acquisition_time, is_processed, data)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        is_processed=excluded.is_processed,
                        data=excluded.data
                ''', (
                    scene.id,
                    scene.acquisition_time.isoformat(),
                    1 if scene.is_processed else 0,
                    scene.model_dump_json()
                ))
                conn.commit()
            return scene
        except Exception as e:
            logger.error(f"Failed to save scene {scene.id}: {e}")
            raise

    def get_scene(self, scene_id: str) -> Optional[SatelliteScene]:
        with get_db_connection() as conn:
            row = conn.execute('SELECT data FROM scenes WHERE id = ?', (scene_id,)).fetchone()
            if row:
                return SatelliteScene.model_validate_json(row['data'])
            return None

    def list_scenes(self, limit: int = 50) -> List[SatelliteScene]:
        with get_db_connection() as conn:
            rows = conn.execute('SELECT data FROM scenes ORDER BY acquisition_time DESC LIMIT ?', (limit,)).fetchall()
            return [SatelliteScene.model_validate_json(row['data']) for row in rows]
