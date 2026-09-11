from typing import List, Optional, Dict, Any
from app.schemas.orchestration import MonitoringJob, JobStatus
from app.schemas.investigation import Investigation, InvestigationCreate
from app.schemas.evidence import EvidenceEvent
from app.schemas.monitoring import MonitoringZone, NewSceneEvent

class JobRepository:
    """Protocol/Interface for MonitoringJob Storage."""
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

    def claim_job(self, job_id: str, worker_id: str, lease_duration_seconds: int = 300) -> Optional[MonitoringJob]:
        raise NotImplementedError


class InvestigationRepository:
    """Protocol/Interface for Investigation Storage."""
    def create_investigation(self, inv_create: InvestigationCreate) -> Investigation:
        raise NotImplementedError

    def get_investigation(self, inv_id: str) -> Optional[Investigation]:
        raise NotImplementedError

    def list_investigations(self) -> List[Investigation]:
        raise NotImplementedError

    def add_evidence(self, evidence: EvidenceEvent) -> EvidenceEvent:
        raise NotImplementedError

    def get_evidence(self, investigation_id: str) -> List[EvidenceEvent]:
        raise NotImplementedError

    def update_investigation_status(self, inv_id: str, status: str, anomaly_geometry: Optional[Dict[str, Any]] = None) -> Optional[Investigation]:
        raise NotImplementedError


class MonitoringZoneRepository:
    """Protocol/Interface for MonitoringZone Storage."""
    def create_zone(self, zone: MonitoringZone, is_demo: bool = False, is_enabled: bool = True) -> MonitoringZone:
        raise NotImplementedError

    def get_zone(self, zone_id: str) -> Optional[MonitoringZone]:
        raise NotImplementedError

    def get_enabled_zones(self) -> List[MonitoringZone]:
        raise NotImplementedError


class SceneEventRepository:
    """Protocol/Interface for Scene Event Storage."""
    def create_event(self, event: NewSceneEvent) -> NewSceneEvent:
        raise NotImplementedError

    def get_event(self, event_id: str) -> Optional[NewSceneEvent]:
        raise NotImplementedError


class SceneRepository:
    """Protocol/Interface for SatelliteScene Storage."""
    def save_scene(self, scene: "SatelliteScene") -> "SatelliteScene":
        raise NotImplementedError

    def get_scene(self, scene_id: str) -> Optional["SatelliteScene"]:
        raise NotImplementedError
        
    def list_scenes(self, limit: int = 50) -> List["SatelliteScene"]:
        raise NotImplementedError
