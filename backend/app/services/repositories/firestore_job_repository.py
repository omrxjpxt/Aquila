import logging
from typing import List, Optional
from datetime import datetime
from firebase_admin import firestore
from google.cloud.firestore_v1.transaction import Transaction
from app.schemas.orchestration import MonitoringJob, JobStatus
from app.services.repositories.interfaces import JobRepository

logger = logging.getLogger(__name__)

class FirestoreJobRepository(JobRepository):
    def __init__(self):
        self.db = firestore.client()
        self.collection = self.db.collection('monitoring_jobs')

    def _create_job_txn(self, transaction: Transaction, job: MonitoringJob) -> MonitoringJob:
        # Check if job with same product_id and monitoring_zone_id exists
        query = self.collection.where('product_id', '==', job.product_id)\
                               .where('monitoring_zone_id', '==', job.monitoring_zone_id)
        docs = query.stream(transaction=transaction)
        
        existing_doc = None
        for doc in docs:
            existing_doc = doc
            break
            
        if existing_doc:
            logger.info(f"Job for product {job.product_id} in zone {job.monitoring_zone_id} already exists in Firestore.")
            return MonitoringJob(**existing_doc.to_dict())

        # Create new job
        doc_ref = self.collection.document(job.job_id)
        job_dict = job.model_dump()
        
        transaction.set(doc_ref, job_dict)
        return job

    def create_job(self, job: MonitoringJob) -> MonitoringJob:
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _txn(t: Transaction) -> MonitoringJob:
            return self._create_job_txn(t, job)

        return _txn(transaction)

    def get_job(self, job_id: str) -> Optional[MonitoringJob]:
        doc_ref = self.collection.document(job_id)
        doc = doc_ref.get()
        if doc.exists:
            return MonitoringJob(**doc.to_dict())
        return None

    def get_job_by_product_and_zone(self, product_id: str, monitoring_zone_id: str) -> Optional[MonitoringJob]:
        query = self.collection.where('product_id', '==', product_id)\
                               .where('monitoring_zone_id', '==', monitoring_zone_id).limit(1)
        docs = query.stream()
        for doc in docs:
            return MonitoringJob(**doc.to_dict())
        return None

    def update_job(self, job: MonitoringJob) -> MonitoringJob:
        doc_ref = self.collection.document(job.job_id)
        job.updated_at = datetime.utcnow()
        doc_ref.set(job.model_dump())
        return job

    def get_jobs_by_status(self, statuses: List[JobStatus]) -> List[MonitoringJob]:
        # Firestore 'in' query works for up to 10 items
        status_strs = [s.value for s in statuses]
        if not status_strs:
            return []
            
        query = self.collection.where('status', 'in', status_strs)
        docs = query.stream()
        return [MonitoringJob(**doc.to_dict()) for doc in docs]

    def _claim_job_txn(self, transaction: Transaction, job_id: str, worker_id: str, lease_duration_seconds: int) -> Optional[MonitoringJob]:
        doc_ref = self.collection.document(job_id)
        snapshot = doc_ref.get(transaction=transaction)
        
        if not snapshot.exists:
            return None
            
        job_data = snapshot.to_dict()
        current_worker = job_data.get('worker_id')
        lease_until = job_data.get('lease_until')
        
        now = datetime.utcnow()
        
        can_claim = False
        if current_worker is None:
            can_claim = True
        elif lease_until:
            if isinstance(lease_until, str):
                lease_dt = datetime.fromisoformat(lease_until.replace('Z', '+00:00'))
            else:
                lease_dt = lease_until
                
            if lease_dt.tzinfo is not None:
                lease_dt = lease_dt.replace(tzinfo=None)
                
            if lease_dt < now:
                can_claim = True

        if can_claim:
            import datetime as dt
            new_lease = now + dt.timedelta(seconds=lease_duration_seconds)
            
            transaction.update(doc_ref, {
                'worker_id': worker_id,
                'claimed_at': now,
                'lease_until': new_lease,
                'updated_at': now
            })
            
            updated_data = {**job_data, 'worker_id': worker_id, 'claimed_at': now, 'lease_until': new_lease, 'updated_at': now}
            return MonitoringJob(**updated_data)
            
        return None

    def claim_job(self, job_id: str, worker_id: str, lease_duration_seconds: int = 300) -> Optional[MonitoringJob]:
        transaction = self.db.transaction()
        
        @firestore.transactional
        def _txn(t: Transaction) -> Optional[MonitoringJob]:
            return self._claim_job_txn(t, job_id, worker_id, lease_duration_seconds)

        try:
            return _txn(transaction)
        except Exception as e:
            logger.error(f"Failed to claim job {job_id} in Firestore: {e}")
            return None
