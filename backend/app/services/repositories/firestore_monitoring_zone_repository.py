import logging
from typing import List, Optional
from datetime import datetime
from firebase_admin import firestore
from app.schemas.monitoring import MonitoringZone
from app.services.repositories.interfaces import MonitoringZoneRepository

logger = logging.getLogger(__name__)

class FirestoreMonitoringZoneRepository(MonitoringZoneRepository):
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection('monitoring_zones')

    def create_zone(self, zone: MonitoringZone, is_demo: bool = False, is_enabled: bool = True) -> MonitoringZone:
        doc_ref = self.collection.document(zone.id)
        now = datetime.utcnow()
        zone_data = zone.model_dump()
        zone_data.update({
            'is_demo': is_demo,
            'is_enabled': is_enabled,
            'created_at': now,
            'updated_at': now
        })
        doc_ref.set(zone_data)
        return zone

    def get_zone(self, zone_id: str) -> Optional[MonitoringZone]:
        doc_ref = self.collection.document(zone_id)
        doc = doc_ref.get()
        if doc.exists:
            # We can strip the extra db fields before instantiating if needed, but Pydantic ignores extra by default
            return MonitoringZone(**doc.to_dict())
        return None

    def get_enabled_zones(self) -> List[MonitoringZone]:
        query = self.collection.where('is_enabled', '==', True)
        docs = query.stream()
        return [MonitoringZone(**doc.to_dict()) for doc in docs]
