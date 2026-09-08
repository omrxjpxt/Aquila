import pytest
import asyncio
from datetime import datetime, timedelta
import uuid

from app.schemas.monitoring import NewSceneEvent
from app.schemas.orchestration import JobStatus, MonitoringJob
from app.services.job_repository import job_repository
from app.services.orchestrator import orchestrator
from app.services.repositories.sqlite_investigation_repository import investigation_repository
from app.schemas.slick import Slick
from app.schemas.look_alike import LookAlikeAssessment, LookAlikeClass, PatchMetadata
from app.schemas.satellite import SatelliteScene, ProcessingResult
from app.schemas.environment import WindObservation, CurrentObservation
from app.schemas.drift import DriftResult, OriginEstimate, DriftTrajectory, DriftUncertainty
from app.schemas.ais import VesselIdentity, GFWPresenceRecord, GFWAISProvenance


@pytest.fixture(autouse=True)
def reset_repositories():
    """Reset the in-memory repositories before each test."""
    from app.services.repositories.db import get_db_connection
    with get_db_connection() as conn:
        conn.execute("DELETE FROM evidence")
        conn.execute("DELETE FROM investigations")
        conn.execute("DELETE FROM monitoring_jobs")
        conn.execute("DELETE FROM scene_events")
    orchestrator.job_contexts.clear()
    yield


@pytest.fixture
def mock_event():
    return NewSceneEvent(
        product_id=f"cdse-uuid-{uuid.uuid4().hex[:6]}",
        product_name="S1A_IW_GRDH_1SDV_TEST",
        collection="sentinel-1-grd",
        acquisition_time=datetime.utcnow(),
        publication_time=datetime.utcnow(),
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        bbox=(0.0, 0.0, 1.0, 1.0),
        monitoring_zone_id="zone-1",
        discovery_source="CDSE_SUBSCRIPTION",
        polarization="VV",
        instrument_mode="IW"
    )


@pytest.mark.asyncio
async def test_full_pipeline_invocation(mock_event, monkeypatch):
    job = orchestrator.ingest_scene_event(mock_event)
    assert job.status == JobStatus.QUEUED

    # 1. Mock CDSE Retrieval
    async def mock_retrieve(bbox, scene, width, height):
        assert scene.id == mock_event.product_id
        return "/tmp/mock_raster.tif"
    monkeypatch.setattr(orchestrator.cdse_service, "retrieve_raster", mock_retrieve)

    # 2. Mock Sentinel Ingestion & Preprocessing
    async def mock_ingest(request):
        assert request.file_path.endswith("mock_raster.tif")
        return SatelliteScene(
            id=request.scene_id,
            provider=request.provider,
            acquisition_time=request.acquisition_time,
            bbox=mock_event.bbox,
            width=100, height=100, crs="EPSG:4326",
            raw_storage_path=request.file_path
        )
    monkeypatch.setattr(orchestrator.sat_service, "ingest_local_scene", mock_ingest)

    async def mock_preprocess(scene):
        return ProcessingResult(scene_id=scene.id, processed_path="/tmp/processed.tif", processing_time_ms=10.0, message="done")
    monkeypatch.setattr(orchestrator.sat_service, "preprocess_scene", mock_preprocess)

    # 3. Mock Detect Slicks
    async def mock_detect(scene):
        return [
            Slick(id="cand_1", source_scene_id=scene.id, geometry={"type": "Polygon", "coordinates": [[[0, 0], [0.1, 0], [0.1, 0.1], [
                  0, 0.1], [0, 0]]]}, area_sq_km=1.0, classification="BASELINE", baseline_score=1.0, detected_at=datetime.utcnow()),
            Slick(id="cand_lookalike", source_scene_id=scene.id, geometry={"type": "Polygon", "coordinates": [[[0.2, 0.2], [0.3, 0.2], [
                  0.3, 0.3], [0.2, 0.3], [0.2, 0.2]]]}, area_sq_km=1.0, classification="BASELINE", baseline_score=1.0, detected_at=datetime.utcnow())
        ]
    monkeypatch.setattr(orchestrator.detect_service, "detect_slicks", mock_detect)

    # 4. Mock Classification
    async def mock_assess(slick, scene_path):
        pred = LookAlikeClass.OIL_LIKE if slick.id == "cand_1" else LookAlikeClass.LOOKALIKE
        return LookAlikeAssessment(
            slick_id=slick.id,
            predicted_class=pred,
            raw_score=2.0 if pred == LookAlikeClass.OIL_LIKE else -2.0,
            uncertainty_margin=0.3,
            model_name="MockModel",
            model_version="v1",
            model_type="HOG",
            training_domain="SYNTH",
            training_representation="SYNTH",
            evaluation_domain="REAL",
            evaluation_status="MOCK",
            artifact_identifier="mock.joblib",
            patch_metadata=PatchMetadata(source_scene_id=slick.source_scene_id,
                                         patch_width=32, patch_height=32, extraction_method="mock"),
            assessed_at=datetime.utcnow()
        )
    monkeypatch.setattr(orchestrator.la_service, "assess_candidate", mock_assess)

    # 5. Mock Environment
    async def mock_wind(lat, lon, time):
        return WindObservation(source="Mock", provider="Mock", dataset="Mock", timestamp=time, requested_lat=lat, requested_lon=lon, requested_timestamp=time, retrieval_timestamp=time, api_endpoint="", availability_status="AVAILABLE", is_mock=True, speed_m_s=5.0, direction_deg=90.0)
    monkeypatch.setattr(orchestrator.env_service, "get_wind", mock_wind)

    async def mock_current(lat, lon, time):
        return CurrentObservation(source="Mock", provider="Mock", dataset="Mock", timestamp=time, requested_lat=lat, requested_lon=lon, requested_timestamp=time, retrieval_timestamp=time, api_endpoint="", availability_status="AVAILABLE", is_mock=True, speed_m_s=0.5, direction_deg=90.0)
    monkeypatch.setattr(orchestrator.env_service, "get_current", mock_current)

    # 6. Mock Drift
    async def mock_drift(scenario, slick):
        origin = OriginEstimate(id="org1", slick_id=slick.id, scenario_id=scenario.scenario_id, estimated_time=datetime.utcnow(
        ), geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]})
        # simplified
        return DriftResult(id="drift1", scenario_id=scenario.scenario_id, slick_id=slick.id, run_time=datetime.utcnow(), origin_estimate=origin, provenance={"engine": "mock", "mode": "MOCK_LIVE"})
    monkeypatch.setattr(orchestrator.drift_service, "execute_hindcast", mock_drift)

    # 7. Mock GFW (simulate token present)
    orchestrator.gfw_provider.token = "fake-token"

    async def mock_search(*args, **kwargs):
        return [GFWPresenceRecord(vessel_id="123456", timestamp=datetime.utcnow(), lon=0.5, lat=0.5)], GFWAISProvenance(api_endpoint="mock", requested_bbox="mock", requested_time_range="mock", retrieval_time=datetime.utcnow())
    monkeypatch.setattr(orchestrator.gfw_provider, "search_vessel_presence", mock_search)

    async def mock_identities(mmsis):
        return [VesselIdentity(mmsi=m, name="Fake Ship") for m in mmsis]
    monkeypatch.setattr(orchestrator.gfw_provider, "get_vessel_identities", mock_identities)

    # We need a proper AttributionResult so we don't throw an exception if we don't mock evaluate
    # But since attribution service evaluate just creates schemas without doing HTTP calls, we can let it run
    # except DriftResult provenance we provided is simple dict instead of object, let's fix the mock drift result

    from app.schemas.drift import DriftProvenance

    async def mock_drift_proper(scenario, slick):
        origin = OriginEstimate(id="org1", slick_id=slick.id, scenario_id=scenario.scenario_id, estimated_time=datetime.utcnow(
        ), geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]})
        return DriftResult(id="drift1", scenario_id=scenario.scenario_id, slick_id=slick.id, run_time=datetime.utcnow(), origin_estimate=origin, provenance=DriftProvenance(engine="OpenDriftEngine", mode="LIVE"))
    monkeypatch.setattr(orchestrator.drift_service, "execute_hindcast", mock_drift_proper)

    await orchestrator.process_job(job)

    assert job.status == JobStatus.REPORT_READY
    assert "CDSE:LIVE" in job.provenance_references
    assert "ENV:OpenMeteo:LIVE" in job.provenance_references
    assert "DRIFT:OpenDrift:LIVE" in job.provenance_references
    assert "GFW:LIVE" in job.provenance_references
    assert "ATTRIBUTION:LIVE" in job.provenance_references

    # Verify Investigation was created for only cand_1
    from app.services.repositories.db import get_db_connection
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM investigations")
        invs = cursor.fetchall()
        assert len(invs) == 1
        inv = dict(invs[0])
    
    assert inv["creation_mode"] == "AUTOMATIC_MONITORING"
    assert "cand_1" in inv["anomaly_id"]
    
    # Verify Context contains candidates
    assert len(orchestrator.job_contexts) == 1


@pytest.mark.asyncio
async def test_gfw_missing_token_produces_unavailable(mock_event, monkeypatch):
    job = orchestrator.ingest_scene_event(mock_event)

    orchestrator.gfw_provider.token = None
    job.status = JobStatus.VESSEL_EVIDENCE

    # We need something in context so it doesn't fail
    orchestrator.job_contexts[job.job_id] = {}

    await orchestrator.process_job(job)

    assert job.status == JobStatus.REPORT_READY
    assert "GFW:UNAVAILABLE" in job.provenance_references
