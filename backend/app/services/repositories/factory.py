from app.core.config import settings
from app.services.repositories.interfaces import (
    JobRepository,
    InvestigationRepository,
    MonitoringZoneRepository,
    SceneEventRepository,
    SceneRepository
)
from app.services.artifact_store import ArtifactStore, LocalArtifactStore

def get_job_repository() -> JobRepository:
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.services.repositories.firestore_job_repository import FirestoreJobRepository
        return FirestoreJobRepository()
    else:
        from app.services.repositories.sqlite_job_repository import SqliteJobRepository
        return SqliteJobRepository()

def get_investigation_repository() -> InvestigationRepository:
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.services.repositories.firestore_investigation_repository import FirestoreInvestigationRepository
        return FirestoreInvestigationRepository()
    else:
        from app.services.repositories.sqlite_investigation_repository import SqliteInvestigationRepository
        return SqliteInvestigationRepository()

def get_monitoring_zone_repository() -> MonitoringZoneRepository:
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.services.repositories.firestore_monitoring_zone_repository import FirestoreMonitoringZoneRepository
        return FirestoreMonitoringZoneRepository()
    else:
        from app.services.repositories.sqlite_monitoring_zone_repository import SqliteMonitoringZoneRepository
        return SqliteMonitoringZoneRepository()

def get_scene_event_repository() -> SceneEventRepository:
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.services.repositories.firestore_scene_event_repository import FirestoreSceneEventRepository
        return FirestoreSceneEventRepository()
    else:
        from app.services.repositories.sqlite_scene_event_repository import SqliteSceneEventRepository
        return SqliteSceneEventRepository()

def get_scene_repository() -> SceneRepository:
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.services.repositories.firestore_scene_repository import FirestoreSceneRepository
        return FirestoreSceneRepository()
    else:
        from app.services.repositories.sqlite_scene_repository import SqliteSceneRepository
        return SqliteSceneRepository()

def get_artifact_store() -> ArtifactStore:
    if settings.ARTIFACT_STORAGE_BACKEND == "gcs":
        from app.services.cloud_storage_artifact_store import CloudStorageArtifactStore
        return CloudStorageArtifactStore()
    else:
        return LocalArtifactStore()
