import logging
import uuid
from typing import List, Optional
from datetime import datetime
from firebase_admin import firestore
from google.cloud.firestore_v1.transaction import Transaction
from app.schemas.investigation import Investigation, InvestigationCreate
from app.schemas.evidence import EvidenceEvent
from app.services.repositories.interfaces import InvestigationRepository

logger = logging.getLogger(__name__)

class FirestoreInvestigationRepository(InvestigationRepository):
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection('investigations')
        self.evidence_collection = self.db.collection('evidence')

    def _create_investigation_txn(self, transaction: Transaction, inv_create: InvestigationCreate) -> Investigation:
        # Idempotency check
        if getattr(inv_create, 'source_product_id', None) and getattr(inv_create, 'anomaly_id', None):
            query = self.collection.where('source_product_id', '==', inv_create.source_product_id)\
                                   .where('anomaly_id', '==', inv_create.anomaly_id)
            docs = query.stream(transaction=transaction)
            
            for doc in docs:
                logger.info(f"Investigation for anomaly {inv_create.anomaly_id} already exists in Firestore.")
                return Investigation(**doc.to_dict())
        elif getattr(inv_create, 'monitoring_job_id', None):
            query = self.collection.where('monitoring_job_id', '==', inv_create.monitoring_job_id)
            docs = query.stream(transaction=transaction)
            for doc in docs:
                logger.info(f"Investigation for job {inv_create.monitoring_job_id} already exists.")
                return Investigation(**doc.to_dict())

        import uuid
        inv_id = f"INV-{datetime.utcnow().strftime('%Y')}-{str(uuid.uuid4())[:8].upper()}"
        now = datetime.utcnow()
        
        # Pydantic dump
        inv_data = inv_create.model_dump()
        inv_data.update({
            'id': inv_id,
            'created_at': now,
            'updated_at': now
        })
        
        doc_ref = self.collection.document(inv_id)
        transaction.set(doc_ref, inv_data)
        
        return Investigation(**inv_data)

    def create_investigation(self, inv_create: InvestigationCreate) -> Investigation:
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _txn(t: Transaction) -> Investigation:
            return self._create_investigation_txn(t, inv_create)

        return _txn(transaction)

    def get_investigation(self, inv_id: str) -> Optional[Investigation]:
        doc_ref = self.collection.document(inv_id)
        doc = doc_ref.get()
        if doc.exists:
            return Investigation(**doc.to_dict())
        return None

    def list_investigations(self) -> List[Investigation]:
        # Simple non-transactional list
        query = self.collection.order_by("created_at", direction="DESCENDING")
        results = []
        for doc in query.stream():
            results.append(Investigation(**doc.to_dict()))
        return results

    @firestore.transactional
    def _add_evidence_txn(self, transaction: Transaction, evidence: EvidenceEvent) -> EvidenceEvent:
        # Check idempotency
        query = self.evidence_collection.where('investigation_id', '==', evidence.investigation_id)\
                                        .where('event_type', '==', evidence.event_type)\
                                        .where('source', '==', evidence.source)
        docs = query.stream(transaction=transaction)
        for doc in docs:
            logger.info(f"Evidence {evidence.event_type} from {evidence.source} already exists for {evidence.investigation_id} in Firestore.")
            return EvidenceEvent(**doc.to_dict())

        doc_ref = self.evidence_collection.document(evidence.id)
        transaction.set(doc_ref, evidence.model_dump())
        return evidence

    def add_evidence(self, evidence: EvidenceEvent) -> EvidenceEvent:
        transaction = self.db.transaction()
        return self._add_evidence_txn(transaction, evidence)

    def get_evidence(self, investigation_id: str) -> List[EvidenceEvent]:
        query = self.evidence_collection.where('investigation_id', '==', investigation_id)
        docs = query.stream()
        return [EvidenceEvent(**doc.to_dict()) for doc in docs]

    def update_investigation_status(
        self, 
        inv_id: str, 
        status: str, 
        anomaly_geometry: Optional[dict] = None,
        source_product_id: Optional[str] = None,
        anomaly_id: Optional[str] = None
    ) -> Optional[Investigation]:
        doc_ref = self.collection.document(inv_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        updates = {"status": status, "updated_at": datetime.utcnow()}
        if anomaly_geometry is not None:
            updates["anomaly_geometry"] = anomaly_geometry
        if source_product_id is not None:
            updates["source_product_id"] = source_product_id
        if anomaly_id is not None:
            updates["anomaly_id"] = anomaly_id
        doc_ref.update(updates)
        updated = doc_ref.get()
        return Investigation(**updated.to_dict()) if updated.exists else None
