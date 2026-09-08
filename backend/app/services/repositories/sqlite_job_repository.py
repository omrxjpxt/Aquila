import json
import logging
from typing import List, Optional
from datetime import datetime, timezone
import sqlite3

from app.schemas.orchestration import MonitoringJob, JobStatus
from app.services.repositories.db import get_db_connection
from app.services.repositories.interfaces import JobRepository

logger = logging.getLogger(__name__)

class SqliteJobRepository(JobRepository):
    
    def _row_to_job(self, row: sqlite3.Row) -> MonitoringJob:
        return MonitoringJob(
            job_id=row['job_id'],
            product_id=row['product_id'],
            product_name=row['product_name'],
            monitoring_zone_id=row['monitoring_zone_id'],
            owner_uid=row['owner_uid'],
            status=JobStatus(row['status']),
            retry_count=row['retry_count'],
            max_retries=row['max_retries'],
            last_error=row['last_error'],
            next_attempt_at=row['next_attempt_at'],
            investigation_ids=json.loads(row['investigation_ids_json']) if row['investigation_ids_json'] else [],
            classification_results=json.loads(row['classification_results_json']) if row['classification_results_json'] else [],
            provenance_references=json.loads(row['provenance_references_json']) if row['provenance_references_json'] else [],
            artifact_references=json.loads(row['artifact_references_json']) if row['artifact_references_json'] else [],
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            worker_id=row['worker_id'],
            claimed_at=row['claimed_at'],
            lease_until=row['lease_until']
        )

    def create_job(self, job: MonitoringJob) -> MonitoringJob:
        idempotency_key = f"{job.product_id}_{job.monitoring_zone_id}"
        
        with get_db_connection() as conn:
            try:
                conn.execute('''
                    INSERT INTO monitoring_jobs (
                        job_id, product_id, product_name, monitoring_zone_id, owner_uid, status, 
                        retry_count, max_retries, last_error, next_attempt_at, 
                        investigation_ids_json, classification_results_json,
                        provenance_references_json, artifact_references_json, 
                        created_at, updated_at, idempotency_key,
                        worker_id, claimed_at, lease_until
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    job.job_id, job.product_id, job.product_name, job.monitoring_zone_id, job.owner_uid, job.status.value,
                    job.retry_count, job.max_retries, job.last_error, job.next_attempt_at,
                    json.dumps(job.investigation_ids, default=str), json.dumps(job.classification_results, default=str),
                    json.dumps(job.provenance_references, default=str), json.dumps(job.artifact_references, default=str),
                    job.created_at, job.updated_at, idempotency_key,
                    job.worker_id, job.claimed_at, job.lease_until
                ))
                # Also save the scene event payload. The MonitoringJob has it initially.
                if job.scene_event_payload:
                    conn.execute('''
                        INSERT OR IGNORE INTO scene_events (id, product_id, zone_id, owner_uid, payload_json, created_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (
                        job.scene_event_payload.get('id', job.job_id), 
                        job.product_id, 
                        job.monitoring_zone_id,
                        job.owner_uid,
                        json.dumps(job.scene_event_payload, default=str),
                        job.created_at
                    ))
                return job.model_copy()
            except sqlite3.IntegrityError:
                # Idempotency collision - return existing job
                cursor = conn.execute("SELECT * FROM monitoring_jobs WHERE idempotency_key = ?", (idempotency_key,))
                row = cursor.fetchone()
                if row:
                    logger.info(f"Idempotency check: Job for {idempotency_key} already exists.")
                    return self._row_to_job(row)
                raise

    def get_job(self, job_id: str) -> Optional[MonitoringJob]:
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM monitoring_jobs WHERE job_id = ?", (job_id,))
            row = cursor.fetchone()
            if not row:
                return None
            job = self._row_to_job(row)
            
            # Load scene payload
            payload_cursor = conn.execute("SELECT payload_json FROM scene_events WHERE product_id = ? AND zone_id = ?", (job.product_id, job.monitoring_zone_id))
            p_row = payload_cursor.fetchone()
            if p_row:
                job.scene_event_payload = json.loads(p_row['payload_json'])
                
            return job
            
    def get_job_by_product_and_zone(self, product_id: str, monitoring_zone_id: str) -> Optional[MonitoringJob]:
        idempotency_key = f"{product_id}_{monitoring_zone_id}"
        with get_db_connection() as conn:
            cursor = conn.execute("SELECT * FROM monitoring_jobs WHERE idempotency_key = ?", (idempotency_key,))
            row = cursor.fetchone()
            if not row:
                return None
            job = self._row_to_job(row)
            
            payload_cursor = conn.execute("SELECT payload_json FROM scene_events WHERE product_id = ? AND zone_id = ?", (job.product_id, job.monitoring_zone_id))
            p_row = payload_cursor.fetchone()
            if p_row:
                job.scene_event_payload = json.loads(p_row['payload_json'])
                
            return job

    def update_job(self, job: MonitoringJob) -> MonitoringJob:
        job.updated_at = datetime.utcnow()
        with get_db_connection() as conn:
            res = conn.execute('''
                UPDATE monitoring_jobs SET
                    status = ?, retry_count = ?, last_error = ?, next_attempt_at = ?,
                    investigation_ids_json = ?, classification_results_json = ?,
                    provenance_references_json = ?, artifact_references_json = ?,
                    updated_at = ?, worker_id = ?, claimed_at = ?, lease_until = ?
                WHERE job_id = ?
            ''', (
                job.status.value, job.retry_count, job.last_error, job.next_attempt_at,
                json.dumps(job.investigation_ids, default=str), json.dumps(job.classification_results, default=str),
                json.dumps(job.provenance_references, default=str), json.dumps(job.artifact_references, default=str),
                job.updated_at, job.worker_id, job.claimed_at, job.lease_until,
                job.job_id
            ))
            if res.rowcount == 0:
                raise ValueError(f"Job {job.job_id} not found in repository.")
        return job.model_copy()
        
    def get_jobs_by_status(self, statuses: List[JobStatus]) -> List[MonitoringJob]:
        status_strs = [s.value for s in statuses]
        with get_db_connection() as conn:
            placeholders = ','.join('?' for _ in status_strs)
            cursor = conn.execute(f"SELECT * FROM monitoring_jobs WHERE status IN ({placeholders})", status_strs)
            rows = cursor.fetchall()
            
            jobs = []
            for row in rows:
                job = self._row_to_job(row)
                payload_cursor = conn.execute("SELECT payload_json FROM scene_events WHERE product_id = ? AND zone_id = ?", (job.product_id, job.monitoring_zone_id))
                p_row = payload_cursor.fetchone()
                if p_row:
                    job.scene_event_payload = json.loads(p_row['payload_json'])
                jobs.append(job)
            return jobs

    def claim_job(self, job_id: str, worker_id: str, lease_duration_seconds: int) -> Optional[MonitoringJob]:
        """Atomically claims a job if it's not currently locked by an active lease."""
        now = datetime.utcnow()
        lease_until = datetime.utcnow()  # We will add timedelta manually to avoid timezone issues with sqlite mapping sometimes
        import datetime as dt
        lease_until = now + dt.timedelta(seconds=lease_duration_seconds)
        
        with get_db_connection() as conn:
            # We can claim if status is QUEUED or RETRY_WAIT, OR if lease is expired
            res = conn.execute('''
                UPDATE monitoring_jobs 
                SET worker_id = ?, claimed_at = ?, lease_until = ?
                WHERE job_id = ? 
                AND (worker_id IS NULL OR lease_until < ?)
            ''', (worker_id, now, lease_until, job_id, now))
            
            if res.rowcount > 0:
                conn.commit()
                return self.get_job(job_id)
            return None

    def get_stale_jobs(self) -> List[MonitoringJob]:
        """Finds jobs that are in an active state but have expired leases."""
        now = datetime.utcnow()
        active_statuses = [
            JobStatus.RETRIEVING.value, JobStatus.PROCESSING.value, 
            JobStatus.CANDIDATES_FOUND.value, JobStatus.CLASSIFYING.value,
            JobStatus.INVESTIGATION_CREATED.value, JobStatus.ENVIRONMENT.value,
            JobStatus.DRIFT.value, JobStatus.VESSEL_EVIDENCE.value, 
            JobStatus.ATTRIBUTION.value
        ]
        placeholders = ','.join('?' for _ in active_statuses)
        with get_db_connection() as conn:
            cursor = conn.execute(f'''
                SELECT * FROM monitoring_jobs 
                WHERE status IN ({placeholders}) 
                AND lease_until IS NOT NULL 
                AND lease_until < ?
            ''', (*active_statuses, now))
            return [self._row_to_job(row) for row in cursor.fetchall()]
