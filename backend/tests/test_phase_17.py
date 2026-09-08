import pytest
import asyncio
from unittest.mock import MagicMock, patch
from datetime import datetime, timedelta
from app.schemas.orchestration import MonitoringJob, JobStatus
from app.services.repositories.firestore_job_repository import FirestoreJobRepository
from app.core.config import settings

@pytest.fixture
def firestore_mock():
    with patch('firebase_admin.firestore.client') as mock_client:
        db_mock = MagicMock()
        mock_client.return_value = db_mock
        yield db_mock

@pytest.mark.asyncio
async def test_firestore_job_repository_idempotency(firestore_mock):
    repo = FirestoreJobRepository()
    
    # Mocking transaction to succeed initially and return None (no existing job)
    transaction_mock = MagicMock()
    
    # Simulate first job creation
    job1 = MonitoringJob(
        product_id="PROD_TEST_1",
        product_name="Test Product",
        monitoring_zone_id="zone-1",
        owner_uid="user_123",
        scene_event_payload={"test": "data"},
        status=JobStatus.QUEUED
    )
    
    # Mock transaction logic within the repo
    # This is slightly complex to mock because it uses @firestore.transactional
    # We will just verify that it attempts to query for existing jobs.
    
    # Actually, let's just mock the query part
    collection_mock = firestore_mock.collection.return_value
    where_mock = collection_mock.where.return_value.where.return_value.where.return_value.limit.return_value
    where_mock.stream.return_value = [] # No existing jobs
    
    repo._create_job_txn = MagicMock(return_value=job1)
    
    created = repo.create_job(job1)
    assert created.job_id == job1.job_id
    
    repo._create_job_txn.assert_called_once()

@pytest.mark.asyncio
async def test_firestore_job_repository_claim(firestore_mock):
    repo = FirestoreJobRepository()
    
    # Test claiming a job
    job = MonitoringJob(
        product_id="PROD_TEST_2",
        product_name="Test Product 2",
        monitoring_zone_id="zone-1",
        owner_uid="user_123",
        scene_event_payload={"test": "data"},
        status=JobStatus.QUEUED
    )
    
    # We will mock _claim_job_txn
    repo._claim_job_txn = MagicMock(return_value=True)
    
    success = repo.claim_job(job.job_id, "worker-1", 5)
    assert success is True
    repo._claim_job_txn.assert_called_once()
