import logging
import json
from typing import Optional, List
from app.schemas.satellite import SatelliteScene
from app.services.repositories.interfaces import SceneRepository
from app.core.firebase_admin import firestore

logger = logging.getLogger(__name__)

class FirestoreSceneRepository(SceneRepository):
    COLLECTION_NAME = "scenes"

    def __init__(self):
        if not firestore:
            logger.warning("Firestore client not initialized. Scene operations will fail.")
            
    def _doc_ref(self, scene_id: str):
        return firestore.collection(self.COLLECTION_NAME).document(scene_id)

    def save_scene(self, scene: SatelliteScene) -> SatelliteScene:
        try:
            data = scene.model_dump(mode="json")
            # bbox is a tuple, which becomes list in JSON
            # datetime becomes ISO string in JSON
            
            self._doc_ref(scene.id).set(data)
            return scene
        except Exception as e:
            logger.error(f"Failed to save scene {scene.id} to Firestore: {e}")
            raise

    def get_scene(self, scene_id: str) -> Optional[SatelliteScene]:
        try:
            doc = self._doc_ref(scene_id).get()
            if doc.exists:
                return SatelliteScene.model_validate(doc.to_dict())
            return None
        except Exception as e:
            logger.error(f"Failed to get scene {scene_id} from Firestore: {e}")
            raise

    def list_scenes(self, limit: int = 50) -> List[SatelliteScene]:
        try:
            query = firestore.collection(self.COLLECTION_NAME).order_by("acquisition_time", direction="DESCENDING").limit(limit)
            results = []
            for doc in query.stream():
                results.append(SatelliteScene.model_validate(doc.to_dict()))
            return results
        except Exception as e:
            logger.error(f"Failed to list scenes from Firestore: {e}")
            raise
