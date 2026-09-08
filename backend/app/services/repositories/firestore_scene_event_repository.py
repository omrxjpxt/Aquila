import logging
from typing import Optional
from datetime import datetime
from firebase_admin import firestore
from app.schemas.monitoring import NewSceneEvent
from app.services.repositories.interfaces import SceneEventRepository

logger = logging.getLogger(__name__)

class FirestoreSceneEventRepository(SceneEventRepository):
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection('scene_events')

    def create_event(self, event: NewSceneEvent) -> NewSceneEvent:
        doc_ref = self.collection.document(event.id)
        now = datetime.utcnow()
        event_data = event.model_dump()
        event_data.update({
            'created_at': now
        })
        doc_ref.set(event_data)
        return event

    def get_event(self, event_id: str) -> Optional[NewSceneEvent]:
        doc_ref = self.collection.document(event_id)
        doc = doc_ref.get()
        if doc.exists:
            return NewSceneEvent(**doc.to_dict())
        return None
