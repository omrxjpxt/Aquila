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
        import json
        doc_ref = self.collection.document(zone.id)
        now = datetime.utcnow()
        zone_data = zone.model_dump()
        
        # Firestore does not support nested arrays (GeoJSON coordinates). Store as string.
        if "geometry" in zone_data and isinstance(zone_data["geometry"], dict):
            zone_data["geometry"] = json.dumps(zone_data["geometry"])
            
        zone_data.update({
            'is_demo': is_demo,
            'is_enabled': is_enabled,
            'created_at': now,
            'updated_at': now
        })
        doc_ref.set(zone_data)
        return zone

    def get_zone(self, zone_id: str) -> Optional[MonitoringZone]:
        import json
        doc_ref = self.collection.document(zone_id)
        doc = doc_ref.get()
        if doc.exists:
            zone_data = doc.to_dict()
            if "geometry" in zone_data and isinstance(zone_data["geometry"], str):
                zone_data["geometry"] = json.loads(zone_data["geometry"])
            return MonitoringZone(**zone_data)
        return None

    def get_enabled_zones(self) -> List[MonitoringZone]:
        import json
        query = self.collection.where('is_enabled', '==', True)
        docs = query.stream()
        zones = []
        for doc in docs:
            zone_data = doc.to_dict()
            if "geometry" in zone_data and isinstance(zone_data["geometry"], str):
                zone_data["geometry"] = json.loads(zone_data["geometry"])
            zones.append(MonitoringZone(**zone_data))
        return zones
