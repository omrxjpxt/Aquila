import logging
from typing import List, Optional
from app.schemas.orchestration import MonitoringJob, JobStatus

logger = logging.getLogger(__name__)


class JobRepository:
    """Protocol/Interface for Job Storage."""
    def create_job(self, job: MonitoringJob) -> MonitoringJob:
        raise NotImplementedError

    def get_job(self, job_id: str) -> Optional[MonitoringJob]:
        raise NotImplementedError
        
    def get_job_by_product_and_zone(self, product_id: str, monitoring_zone_id: str) -> Optional[MonitoringJob]:
        raise NotImplementedError

    def update_job(self, job: MonitoringJob) -> MonitoringJob:
        raise NotImplementedError
        
    def get_jobs_by_status(self, statuses: List[JobStatus]) -> List[MonitoringJob]:
        raise NotImplementedError


class InMemoryJobRepository(JobRepository):
    """
    DEMO / MVP ORCHESTRATION INFRASTRUCTURE
    
    LIMITATIONS:
    - Process restart loses all in-memory jobs.
    - Multiple API instances do not share job state.
    - Worker lifetime is tied to the application process.
    - No durable queue or distributed locking.
    
    This fulfills the requirement for Phase 16B orchestration without
    introducing Celery/Redis prematurely.
    """
    def __init__(self):
        self._jobs = {}  # type: dict[str, MonitoringJob]
        
    def create_job(self, job: MonitoringJob) -> MonitoringJob:
        existing = self.get_job_by_product_and_zone(job.product_id, job.monitoring_zone_id)
        if existing:
            # Idempotency: Return existing job instead of duplicating
            logger.info(f"Job for product {job.product_id} in zone {job.monitoring_zone_id} already exists.")
            return existing
            
        self._jobs[job.job_id] = job.model_copy()
        return job.model_copy()

    def get_job(self, job_id: str) -> Optional[MonitoringJob]:
        job = self._jobs.get(job_id)
        return job.model_copy() if job else None
        
    def get_job_by_product_and_zone(self, product_id: str, monitoring_zone_id: str) -> Optional[MonitoringJob]:
        for job in self._jobs.values():
            if job.product_id == product_id and job.monitoring_zone_id == monitoring_zone_id:
                return job.model_copy()
        return None

    def update_job(self, job: MonitoringJob) -> MonitoringJob:
        if job.job_id not in self._jobs:
            raise ValueError(f"Job {job.job_id} not found in repository.")
            
        self._jobs[job.job_id] = job.model_copy()
        return job.model_copy()
        
    def get_jobs_by_status(self, statuses: List[JobStatus]) -> List[MonitoringJob]:
        results = []
        for job in self._jobs.values():
            if job.status in statuses:
                results.append(job.model_copy())
        return results

# Singleton instance for the MVP
job_repository = InMemoryJobRepository()
