import asyncio
import logging
from datetime import datetime, timedelta
import uuid
import os
from typing import List, Optional, Dict, Any

from app.schemas.orchestration import MonitoringJob, JobStatus
from app.schemas.monitoring import NewSceneEvent
from app.schemas.investigation import InvestigationCreate
from app.schemas.look_alike import LookAlikeRequest, LookAlikeClass
from app.schemas.analysis import RealSceneAnalysisResult
from app.schemas.slick import Slick
from app.schemas.satellite import SatelliteSearchResult, SceneIngestRequest, SatelliteScene
from app.schemas.drift import DriftScenario, OriginEstimate, DriftResult
from app.schemas.ais import VesselCandidate
from app.schemas.evidence import EvidenceEvent

from app.services.repositories.factory import (
    get_job_repository, 
    get_investigation_repository, 
    get_artifact_store,
    get_scene_event_repository
)

from app.services.failure_policy import classify_failure, FailureClassification

from app.services.investigation_trigger_policy import default_trigger_policy
from app.services.cdse_service import CDSEService
from app.services.satellite_service import SatelliteService
from app.services.slick_detection_service import SlickDetectionService
from app.services.look_alike_service import LookAlikeService
from app.services.open_meteo_service import OpenMeteoEnvironmentalService
from app.services.drift_service import DriftService
from app.services.gfw_ais_provider import GFWAISProvider
from app.services.attribution_service import AttributionService

logger = logging.getLogger(__name__)

class OrchestrationService:
    def __init__(self):
        self.cdse_service = CDSEService()
        self.sat_service = SatelliteService()
        self.detect_service = SlickDetectionService()
        self.la_service = LookAlikeService()
        self.env_service = OpenMeteoEnvironmentalService()
        self.drift_service = DriftService()
        self.gfw_provider = GFWAISProvider()
        self.attribution_service = AttributionService()
        
        # Transient context storage to avoid dumping large artifacts into MonitoringJob
        self.job_contexts: Dict[str, Dict[str, Any]] = {}
        
    @property
    def job_repository(self):
        if not hasattr(self, '_job_repository'):
            self._job_repository = get_job_repository()
        return self._job_repository

    @property
    def investigation_repository(self):
        if not hasattr(self, '_investigation_repository'):
            self._investigation_repository = get_investigation_repository()
        return self._investigation_repository
        
    @property
    def artifact_store(self):
        if not hasattr(self, '_artifact_store'):
            self._artifact_store = get_artifact_store()
        return self._artifact_store
        
    @property
    def scene_event_repository(self):
        if not hasattr(self, '_scene_event_repository'):
            self._scene_event_repository = get_scene_event_repository()
        return self._scene_event_repository

    def ingest_scene_event(self, event: NewSceneEvent) -> Optional[MonitoringJob]:
        job = MonitoringJob(
            product_id=event.product_id,
            product_name=event.product_name,
            monitoring_zone_id=event.monitoring_zone_id or "default",
            owner_uid=event.owner_uid,
            scene_event_payload=event.model_dump(mode='json'),
            status=JobStatus.QUEUED
        )
        existing_job = self.job_repository.get_job_by_product_and_zone(
            product_id=event.product_id,
            monitoring_zone_id=event.monitoring_zone_id
        )
        if existing_job:
            logger.info(f"Job for {event.product_id} in {event.monitoring_zone_id} already exists.")
            return existing_job
            
        # Also store the raw event for provenance
        self.scene_event_repository.create_event(event)

        return self.job_repository.create_job(job)

    def _get_context(self, job_id: str) -> Dict[str, Any]:
        if job_id not in self.job_contexts:
            self.job_contexts[job_id] = {}
        return self.job_contexts[job_id]

    async def recover_stale_jobs(self):
        """Finds jobs with expired leases and safely transitions them based on stage."""
        stale_jobs = self.job_repository.get_stale_jobs()
        for job in stale_jobs:
            logger.info(f"Recovering stale job {job.job_id} currently in state {job.status}")
            # Reset worker ownership
            job.worker_id = None
            job.claimed_at = None
            job.lease_until = None
            
            # Simple fallback strategy: move back to RETRY_WAIT and clear current state
            # The actual stages handle avoiding duplicate work when retried
            job.status = JobStatus.RETRY_WAIT
            job.next_attempt_at = datetime.utcnow()
            self.job_repository.update_job(job)

    async def process_job(self, job: MonitoringJob):
        """
        State machine transition runner for a single job.
        Runs until a wait state, terminal state, or unhandled exception.
        """
        try:
            while job.status not in [JobStatus.RESOLVED, JobStatus.FAILED, JobStatus.REPORT_READY, JobStatus.RETRY_WAIT]:
                # Renew lease
                job.lease_until = datetime.utcnow() + timedelta(minutes=5)
                self.job_repository.update_job(job)
                
                logger.info(
                    f"Job {job.job_id} entering state {job.status}",
                    extra={"structured_data": {
                        "event": "JOB_STATE_CHANGE",
                        "job_id": job.job_id,
                        "status": job.status,
                        "product_id": job.product_id
                    }}
                )
                if job.status == JobStatus.QUEUED:
                    await self._handle_queued(job)
                elif job.status == JobStatus.RETRIEVING:
                    await self._handle_retrieving(job)
                elif job.status == JobStatus.PROCESSING:
                    await self._handle_processing(job)
                elif job.status == JobStatus.CANDIDATES_FOUND:
                    await self._handle_candidates_found(job)
                elif job.status == JobStatus.CLASSIFYING:
                    await self._handle_classifying(job)
                elif job.status == JobStatus.INVESTIGATION_CREATED:
                    await self._handle_investigation_created(job)
                elif job.status == JobStatus.ENVIRONMENT:
                    await self._handle_environment(job)
                elif job.status == JobStatus.DRIFT:
                    await self._handle_drift(job)
                elif job.status == JobStatus.VESSEL_EVIDENCE:
                    await self._handle_vessel_evidence(job)
                elif job.status == JobStatus.ATTRIBUTION:
                    await self._handle_attribution(job)
                
                job.updated_at = datetime.utcnow()
                self.job_repository.update_job(job)
                
            # Clear lease when done processing
            job.worker_id = None
            job.claimed_at = None
            job.lease_until = None
            self.job_repository.update_job(job)
                
        except Exception as e:
            logger.error(f"Error processing job {job.job_id} in state {job.status}: {str(e)}", exc_info=True)
            self._handle_failure(job, e)

    def _handle_failure(self, job: MonitoringJob, error: Exception):
        classification, reason = classify_failure(error, str(job.status))
        
        job.last_error = f"[{classification.value}] {reason}: {str(error)}"
        job.retry_count += 1
        
        # We record the stage where it failed
        if not hasattr(job, "failure_stage"): # ensure it's recorded (might need schema update but we can put it in last_error)
            pass
            
        from app.core.config import settings
        max_retries = settings.WORKER_MAX_RETRIES

        job.updated_at = datetime.utcnow()
        job.worker_id = None
        job.claimed_at = None
        job.lease_until = None

        if classification == FailureClassification.PERMANENT or job.retry_count >= max_retries:
            logger.error(
                f"Job {job.job_id} permanently failed at {job.status}. Reason: {reason}",
                extra={"structured_data": {
                    "event": "JOB_FAILED_PERMANENT",
                    "job_id": job.job_id,
                    "status": job.status,
                    "reason": reason
                }}
            )
            job.status = JobStatus.FAILED
            job.next_attempt_at = None
        else:
            logger.warning(
                f"Job {job.job_id} transient failure at {job.status}. Retrying (Attempt {job.retry_count}/{max_retries}). Reason: {reason}",
                extra={"structured_data": {
                    "event": "JOB_FAILED_TRANSIENT",
                    "job_id": job.job_id,
                    "status": job.status,
                    "retry_count": job.retry_count,
                    "reason": reason
                }}
            )
            job.status = JobStatus.RETRY_WAIT
            # Bounded backoff: 2^retry_count * 15 seconds
            delay = (2 ** job.retry_count) * 15
            job.next_attempt_at = datetime.utcnow() + timedelta(seconds=delay)
        self.job_repository.update_job(job)

    def _find_artifact(self, job: MonitoringJob, artifact_type: str) -> Optional[Dict[str, Any]]:
        for art in job.artifact_references:
            if art.get("artifact_type") == artifact_type:
                return art
        return None

    async def _handle_queued(self, job: MonitoringJob):
        job.status = JobStatus.RETRIEVING

    async def _handle_retrieving(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        
        # STAGE-AWARE RECOVERY
        existing_artifact = self._find_artifact(job, "RAW_S1_RASTER")
        if existing_artifact:
            try:
                # verify it exists
                file_path = self.artifact_store.get_artifact_path(existing_artifact)
                logger.info(f"Recovered RETRIEVING stage using existing artifact: {file_path}")
                ctx['raster_file_path'] = file_path
                job.status = JobStatus.PROCESSING
                return
            except FileNotFoundError:
                logger.warning(f"Artifact {existing_artifact['artifact_id']} missing from disk. Re-retrieving.")
                job.artifact_references.remove(existing_artifact)
        
        event = NewSceneEvent.model_validate(job.scene_event_payload)
        search_result = SatelliteSearchResult(
            id=event.product_id,
            source="CDSE",
            provenance="LIVE",
            collection=event.collection,
            acquisition_time=event.acquisition_time,
            bbox=event.bbox,
            geometry=event.geometry,
            platform=event.platform,
            orbit_direction=event.orbit_direction,
            polarization=event.polarization,
            instrument_mode=event.instrument_mode
        )
        
        file_path = await self.cdse_service.retrieve_raster(
            bbox=event.bbox,
            scene=search_result,
            width=2048,
            height=2048
        )
        
        # Persist artifact
        artifact_ref = self.artifact_store.store_artifact(file_path, "RAW_S1_RASTER", job.job_id)
        job.artifact_references.append(artifact_ref)
        
        ctx['raster_file_path'] = artifact_ref['path']
        if "CDSE:LIVE" not in job.provenance_references:
            job.provenance_references.append("CDSE:LIVE")
        
        job.status = JobStatus.PROCESSING

    async def _handle_processing(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        
        # STAGE-AWARE RECOVERY: If we already have candidates and processed raster, skip.
        # But candidates are large, so we don't persist them in SQL, we only persist investigation IDs later.
        # If the job crashed here, we just re-process. Re-processing is safe locally.
        existing_proc_art = self._find_artifact(job, "PROCESSED_S1_RASTER")
        if existing_proc_art and 'candidates' in ctx:
             # Fast recovery if already in context (e.g. from tests)
             job.status = JobStatus.CANDIDATES_FOUND if ctx['candidates'] else JobStatus.RESOLVED
             return
             
        file_path = ctx.get('raster_file_path')
        if not file_path:
            # Look up artifact
            raw_art = self._find_artifact(job, "RAW_S1_RASTER")
            if not raw_art:
                raise RuntimeError("Raster file path not found for processing.")
            file_path = self.artifact_store.get_artifact_path(raw_art)
            ctx['raster_file_path'] = file_path
            
        event = NewSceneEvent.model_validate(job.scene_event_payload)
        
        ingest_req = SceneIngestRequest(
            file_path=file_path,
            provider="CDSE",
            scene_id=event.product_id,
            acquisition_time=event.acquisition_time,
            source="CDSE",
            provenance="LIVE",
            collection=event.collection,
            polarization=event.polarization,
            retrieval_timestamp=datetime.utcnow()
        )
        
        scene = await self.sat_service.ingest_local_scene(ingest_req)
        proc_res = await self.sat_service.preprocess_scene(scene)
        scene.is_processed = True
        scene.processed_storage_path = proc_res.processed_path
        
        proc_art_ref = self.artifact_store.store_artifact(scene.processed_storage_path, "PROCESSED_S1_RASTER", job.job_id)
        if existing_proc_art not in job.artifact_references: # Simplistic check
            # We don't have good equality for dicts here, just appending for MVP if not exact match.
            # In a real app we'd pop the old one.
            pass
        # Let's just append
        job.artifact_references.append(proc_art_ref)
        scene.processed_storage_path = proc_art_ref['path'] # Use artifact store path
        
        candidates = await self.detect_service.detect_slicks(scene)
        
        ctx['scene'] = scene
        ctx['candidates'] = candidates
        
        if candidates:
            job.status = JobStatus.CANDIDATES_FOUND
        else:
            job.status = JobStatus.RESOLVED

    async def _handle_candidates_found(self, job: MonitoringJob):
        job.status = JobStatus.CLASSIFYING

    async def _handle_classifying(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        scene = ctx['scene']
        candidates: List[Slick] = ctx['candidates']
        
        found_interesting = False
        
        for candidate in candidates:
            assessment = await self.la_service.assess_candidate(candidate, scene.processed_storage_path)
            
            result_summary = {
                "patch_id": candidate.id,
                "predicted_class": assessment.predicted_class.value,
                "score": assessment.raw_score,
                "model_name": assessment.model_name,
                "evaluation_status": assessment.evaluation_status
            }
            
            # STAGE-AWARE RECOVERY: Check if classification was already stored
            if not any(r['patch_id'] == candidate.id for r in job.classification_results):
                job.classification_results.append(result_summary)
            
            if default_trigger_policy.should_investigate(result_summary):
                found_interesting = True
                anomaly_fingerprint = f"{job.product_id}_{candidate.id}"
                
                # Idempotent Investigation Creation
                inv_create = InvestigationCreate(
                    title=f"Auto Investigation: {job.product_name}",
                    status="OPEN",
                    priority="HIGH",
                    creation_mode="AUTOMATIC_MONITORING",
                    owner_uid=job.owner_uid,
                    source_product_id=job.product_id,
                    monitoring_zone_id=job.monitoring_zone_id,
                    anomaly_id=anomaly_fingerprint,
                    anomaly_geometry=candidate.geometry
                )
                
                inv = self.investigation_repository.create_investigation(inv_create)
                
                if inv.id not in job.investigation_ids:
                    job.investigation_ids.append(inv.id)
                    
                # Add Classification Evidence
                ev = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    event_type="SATELLITE_CLASSIFICATION",
                    source="LookAlikeService",
                    description=f"Classified as {assessment.predicted_class.value}",
                    event_time=scene.acquisition_time,
                    metadata=result_summary
                )
                self.investigation_repository.add_evidence(ev)
                    
                if 'investigation_targets' not in ctx:
                    ctx['investigation_targets'] = []
                    
                # Prevent dupes in ctx if recovering
                if not any(t['investigation_id'] == inv.id for t in ctx['investigation_targets']):
                    ctx['investigation_targets'].append({
                        'investigation_id': inv.id,
                        'slick': candidate
                    })

        if found_interesting:
            job.status = JobStatus.INVESTIGATION_CREATED
        else:
            job.status = JobStatus.RESOLVED

    async def _handle_investigation_created(self, job: MonitoringJob):
        job.status = JobStatus.ENVIRONMENT

    async def _handle_environment(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        targets = ctx.get('investigation_targets', [])
        
        for target in targets:
            slick: Slick = target['slick']
            coords = slick.geometry.get("coordinates", [[[]]])[0]
            if len(coords) > 0:
                lon = sum(p[0] for p in coords) / len(coords)
                lat = sum(p[1] for p in coords) / len(coords)
            else:
                lon, lat = 0.0, 0.0
                
            try:
                wind = await self.env_service.get_wind(lat, lon, slick.detected_at)
                current = await self.env_service.get_current(lat, lon, slick.detected_at)
                
                target['wind'] = wind
                target['current'] = current
                
                if "ENV:OpenMeteo:LIVE" not in job.provenance_references:
                    job.provenance_references.append("ENV:OpenMeteo:LIVE")
                    
                # Persist Environmental Evidence
                ev = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=target['investigation_id'],
                    event_type="ENVIRONMENTAL_OBSERVATION",
                    source="OpenMeteo",
                    description=f"Wind: {wind.speed_m_s}m/s @ {wind.direction_deg}°. Current: {current.speed_m_s}m/s @ {current.direction_deg}°",
                    event_time=slick.detected_at,
                    metadata={"wind": wind.__dict__, "current": current.__dict__}
                )
                self.investigation_repository.add_evidence(ev)
                
            except Exception as e:
                logger.warning(f"Environment unavailable for {slick.id}: {e}")
                if "ENV:UNAVAILABLE" not in job.provenance_references:
                    job.provenance_references.append("ENV:UNAVAILABLE")
                
        job.status = JobStatus.DRIFT

    async def _handle_drift(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        targets = ctx.get('investigation_targets', [])
        
        for target in targets:
            slick: Slick = target['slick']
            scenario = DriftScenario(
                scenario_id=f"SCEN_{uuid.uuid4().hex[:8]}",
                investigation_id=target['investigation_id'],
                slick_id=slick.id,
                start_time=slick.detected_at,
                end_time=slick.detected_at - timedelta(hours=24),
                is_backward=True,
                forcing_sources=["LIVE_OPEN_METEO"]
            )
            
            try:
                drift_result = await self.drift_service.execute_hindcast(scenario, slick)
                target['drift_result'] = drift_result
                if "DRIFT:OpenDrift:LIVE" not in job.provenance_references:
                    job.provenance_references.append("DRIFT:OpenDrift:LIVE")
                    
                # Store artifact if drift service produces files (mocking for Phase 16D abstraction)
                # target['drift_result'].geojson_path could be stored here.
                
                ev = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=target['investigation_id'],
                    event_type="DRIFT_HINDCAST",
                    source="OpenDrift",
                    description=f"24h hindcast completed.",
                    event_time=drift_result.origin_estimate.estimated_time,
                    metadata={"origin_estimate": drift_result.origin_estimate.model_dump()}
                )
                self.investigation_repository.add_evidence(ev)
                
            except Exception as e:
                logger.error(f"Drift unavailable for {slick.id}: {e}", exc_info=True)
                if "DRIFT:FAILED" not in job.provenance_references:
                    job.provenance_references.append("DRIFT:FAILED")
                
        job.status = JobStatus.VESSEL_EVIDENCE

    async def _handle_vessel_evidence(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        targets = ctx.get('investigation_targets', [])
        
        if not self.gfw_provider.token:
            logger.warning("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            if "GFW:UNAVAILABLE" not in job.provenance_references:
                job.provenance_references.append("GFW:UNAVAILABLE")
            job.status = JobStatus.ATTRIBUTION
            return
            
        for target in targets:
            drift_result: Optional[DriftResult] = target.get('drift_result')
            if not drift_result or not drift_result.origin_estimate:
                continue
                
            coords = drift_result.origin_estimate.geometry.get("coordinates", [[[]]])[0]
            if len(coords) > 0:
                lons = [p[0] for p in coords]
                lats = [p[1] for p in coords]
                min_lon, max_lon = min(lons), max(lons)
                min_lat, max_lat = min(lats), max(lats)
            else:
                min_lon, max_lon = -180.0, 180.0
                min_lat, max_lat = -90.0, 90.0
                
            try:
                records, provenance = await self.gfw_provider.search_vessel_presence(
                    min_lon=min_lon, max_lat=max_lat, max_lon=max_lon, min_lat=min_lat,
                    start_time=drift_result.origin_estimate.estimated_time - timedelta(hours=2),
                    end_time=drift_result.origin_estimate.estimated_time + timedelta(hours=2)
                )
                
                mmsis = list(set([r.vessel_id for r in records if r.vessel_id]))
                identities = await self.gfw_provider.get_vessel_identities(mmsis)
                
                target['gfw_records'] = records
                target['gfw_identities'] = identities
                
                if "GFW:LIVE" not in job.provenance_references:
                    job.provenance_references.append("GFW:LIVE")
                    
                ev = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=target['investigation_id'],
                    event_type="AIS_PRESENCE",
                    source="GFW",
                    description=f"Found {len(mmsis)} vessels in origin region.",
                    event_time=drift_result.origin_estimate.estimated_time,
                    metadata={"vessel_count": len(mmsis), "mmsis": mmsis}
                )
                self.investigation_repository.add_evidence(ev)
                
            except Exception as e:
                logger.error(f"GFW Vessel search failed: {e}", exc_info=True)
                if "GFW:UNAVAILABLE" not in job.provenance_references:
                    job.provenance_references.append("GFW:UNAVAILABLE")

        job.status = JobStatus.ATTRIBUTION

    async def _handle_attribution(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        targets = ctx.get('investigation_targets', [])
        
        for target in targets:
            drift_result: Optional[DriftResult] = target.get('drift_result')
            gfw_identities = target.get('gfw_identities', [])
            
            candidates = []
            from app.schemas.ais import VesselIdentity, AISTrack, AISProvenance
            
            for ident in gfw_identities:
                cand = VesselCandidate(
                    id=f"cand_{uuid.uuid4().hex[:8]}",
                    investigation_id=target['investigation_id'],
                    identity=ident,
                    track=AISTrack(mmsi=ident.mmsi, geometry={"type": "MultiLineString", "coordinates": []}, total_observations=0, longest_gap_hours=0.0),
                    spatially_relevant=True,
                    temporally_relevant=True,
                    inside_origin_region=True,
                    closest_approach_meters=100.0,
                    provenance=AISProvenance(mode="LIVE", source="GFW")
                )
                candidates.append(cand)
                
            if drift_result and drift_result.origin_estimate:
                att_result = self.attribution_service.evaluate(
                    investigation_id=target['investigation_id'],
                    origin=drift_result.origin_estimate,
                    drift=drift_result,
                    candidates=candidates
                )
                target['attribution_result'] = att_result
                if "ATTRIBUTION:LIVE" not in job.provenance_references:
                    job.provenance_references.append("ATTRIBUTION:LIVE")
                    
                ev = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=target['investigation_id'],
                    event_type="ATTRIBUTION_EVALUATION",
                    source="AttributionService",
                    description=f"Evaluated {len(candidates)} candidates. Top matches: {len(att_result.candidates)}",
                    event_time=datetime.utcnow(),
                    metadata=att_result.model_dump()
                )
                self.investigation_repository.add_evidence(ev)
                
        job.status = JobStatus.REPORT_READY


orchestrator = OrchestrationService()
