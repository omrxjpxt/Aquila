from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
import uuid


class JobStatus(str, Enum):
    DISCOVERED = "DISCOVERED"
    QUEUED = "QUEUED"
    RETRIEVING = "RETRIEVING"
    PROCESSING = "PROCESSING"
    CANDIDATES_FOUND = "CANDIDATES_FOUND"
    CLASSIFYING = "CLASSIFYING"
    INVESTIGATION_CREATED = "INVESTIGATION_CREATED"
    ENVIRONMENT = "ENVIRONMENT"
    DRIFT = "DRIFT"
    VESSEL_EVIDENCE = "VESSEL_EVIDENCE"
    ATTRIBUTION = "ATTRIBUTION"
    REPORT_READY = "REPORT_READY"
    RESOLVED = "RESOLVED"
    RETRY_WAIT = "RETRY_WAIT"
    FAILED = "FAILED"


class MonitoringJob(BaseModel):
    """
    Represents the execution state of an automated workflow for a single satellite scene in a monitoring zone.
    """
    job_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    product_id: str
    product_name: str
    monitoring_zone_id: str
    monitoring_zone_name: Optional[str] = Field(default=None, description="Human-readable name of the monitoring zone")
    owner_uid: str = Field(default="SYSTEM", description="Inherited from NewSceneEvent/MonitoringZone")
    
    status: JobStatus = Field(default=JobStatus.DISCOVERED)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    retry_count: int = Field(default=0)
    max_retries: int = Field(default=3)
    last_error: Optional[str] = None
    next_attempt_at: Optional[datetime] = None
    
    # Internal references generated during the pipeline
    scene_event_payload: Dict[str, Any] = Field(default_factory=dict, description="Raw NewSceneEvent payload to reconstruct event later")
    investigation_ids: List[str] = Field(default_factory=list, description="IDs of investigations created from this scene")
    classification_results: List[Dict[str, Any]] = Field(default_factory=list, description="Summaries of classification outputs for traceability")
    provenance_references: List[str] = Field(default_factory=list, description="List of evidence/service providers used")
    artifact_references: List[Dict[str, Any]] = Field(default_factory=list, description="List of large artifact references")
    
    # Claiming & Leases
    worker_id: Optional[str] = None
    claimed_at: Optional[datetime] = None
    lease_until: Optional[datetime] = None
