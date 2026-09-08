import asyncio
import logging
from datetime import datetime, timedelta
import uuid
from typing import List, Optional, Dict, Any

from app.schemas.orchestration import MonitoringJob, JobStatus
from app.schemas.monitoring import NewSceneEvent
from app.schemas.investigation import Investigation
from app.schemas.look_alike import LookAlikeRequest, LookAlikeClass
from app.schemas.analysis import RealSceneAnalysisResult
from app.schemas.slick import Slick
from app.schemas.satellite import SatelliteSearchResult, SceneIngestRequest, SatelliteScene
from app.schemas.drift import DriftScenario, OriginEstimate, DriftResult
from app.schemas.ais import VesselCandidate

from app.services.job_repository import job_repository
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

# MVP in-memory DB for investigations
investigations_db = {}  # type: dict[str, Investigation]

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

    def ingest_scene_event(self, event: NewSceneEvent) -> Optional[MonitoringJob]:
        """
        Accepts NewSceneEvent, checks for deduplication, and creates a MonitoringJob.
        """
        existing_job = job_repository.get_job_by_product_and_zone(event.product_id, event.monitoring_zone_id or "default")
        if existing_job:
            logger.info(f"Event for product {event.product_id} in zone {event.monitoring_zone_id} is already being processed.")
            return existing_job

        job = MonitoringJob(
            product_id=event.product_id,
            product_name=event.product_name,
            monitoring_zone_id=event.monitoring_zone_id or "default",
            scene_event_payload=event.model_dump(),
            status=JobStatus.QUEUED
        )
        return job_repository.create_job(job)

    def _get_context(self, job_id: str) -> Dict[str, Any]:
        if job_id not in self.job_contexts:
            self.job_contexts[job_id] = {}
        return self.job_contexts[job_id]

    async def process_job(self, job: MonitoringJob):
        """
        State machine transition runner for a single job.
        Runs until a wait state, terminal state, or unhandled exception.
        """
        try:
            while job.status not in [JobStatus.RESOLVED, JobStatus.FAILED, JobStatus.REPORT_READY, JobStatus.RETRY_WAIT]:
                logger.info(f"Job {job.job_id} entering state {job.status}")
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
                job_repository.update_job(job)
                
        except Exception as e:
            logger.error(f"Error processing job {job.job_id} in state {job.status}: {str(e)}", exc_info=True)
            self._handle_failure(job, str(e))

    def _handle_failure(self, job: MonitoringJob, error_msg: str):
        job.retry_count += 1
        job.last_error = error_msg
        job.updated_at = datetime.utcnow()
        if job.retry_count >= job.max_retries:
            job.status = JobStatus.FAILED
        else:
            job.status = JobStatus.RETRY_WAIT
            # Bounded backoff: 2^retry_count * 15 seconds
            delay = (2 ** job.retry_count) * 15
            job.next_attempt_at = datetime.utcnow() + timedelta(seconds=delay)
        job_repository.update_job(job)

    async def _handle_queued(self, job: MonitoringJob):
        job.status = JobStatus.RETRIEVING

    async def _handle_retrieving(self, job: MonitoringJob):
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
        
        # We fetch the raster
        # Note: CDSEService.retrieve_raster signature is (bbox, scene, width, height)
        # We pass width=1024, height=1024 to limit size in testing if needed, or None for full
        file_path = await self.cdse_service.retrieve_raster(
            bbox=event.bbox,
            scene=search_result,
            width=2048,
            height=2048
        )
        
        ctx = self._get_context(job.job_id)
        ctx['raster_file_path'] = file_path
        job.provenance_references.append("CDSE:LIVE")
        
        job.status = JobStatus.PROCESSING

    async def _handle_processing(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        file_path = ctx.get('raster_file_path')
        if not file_path:
            raise RuntimeError("Raster file path not found in context.")
            
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
        
        # Preprocess
        proc_res = await self.sat_service.preprocess_scene(scene)
        scene.is_processed = True
        scene.processed_storage_path = proc_res.processed_path
        
        # Detect
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
            job.classification_results.append(result_summary)
            
            if default_trigger_policy.should_investigate(result_summary):
                found_interesting = True
                anomaly_fingerprint = f"{job.product_id}_{job.monitoring_zone_id}_{candidate.id}"
                
                # Deduplicate
                existing_inv = next((inv for inv in investigations_db.values() if getattr(inv, 'anomaly_id', None) == anomaly_fingerprint), None)
                if not existing_inv:
                    inv_id = f"INV-AUTO-{uuid.uuid4().hex[:6].upper()}"
                    inv = Investigation(
                        id=inv_id,
                        title=f"Auto Investigation: {job.product_name}",
                        status="OPEN",
                        priority="HIGH",
                        creation_mode="AUTOMATIC_MONITORING",
                        source_product_id=job.product_id,
                        monitoring_zone_id=job.monitoring_zone_id,
                        anomaly_id=anomaly_fingerprint,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    investigations_db[inv_id] = inv
                    job.investigation_ids.append(inv_id)
                    
                    # We store candidate + investigation linkage in context for downstream
                    if 'investigation_targets' not in ctx:
                        ctx['investigation_targets'] = []
                    ctx['investigation_targets'].append({
                        'investigation_id': inv_id,
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
            # Compute rough centroid from slick geometry
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
                job.provenance_references.append("ENV:OpenMeteo:LIVE")
            except Exception as e:
                logger.warning(f"Environment unavailable for {slick.id}: {e}")
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
                end_time=slick.detected_at - timedelta(hours=24),  # 24h hindcast
                is_backward=True,
                forcing_sources=["LIVE_OPEN_METEO"]
            )
            
            try:
                drift_result = await self.drift_service.execute_hindcast(scenario, slick)
                target['drift_result'] = drift_result
                job.provenance_references.append("DRIFT:OpenDrift:LIVE")
            except Exception as e:
                logger.error(f"Drift unavailable for {slick.id}: {e}", exc_info=True)
                job.provenance_references.append("DRIFT:FAILED")
                
        job.status = JobStatus.VESSEL_EVIDENCE

    async def _handle_vessel_evidence(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        targets = ctx.get('investigation_targets', [])
        
        if not self.gfw_provider.token:
            logger.warning("GFW_API_TOKEN is not configured. GFW services are unavailable.")
            job.provenance_references.append("GFW:UNAVAILABLE")
            job.status = JobStatus.ATTRIBUTION
            return
            
        for target in targets:
            drift_result: Optional[DriftResult] = target.get('drift_result')
            if not drift_result or not drift_result.origin_estimate:
                continue
                
            # Compute a rough bounding box around origin geometry
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
                    min_lon=min_lon,
                    min_lat=min_lat,
                    max_lon=max_lon,
                    max_lat=max_lat,
                    start_time=drift_result.origin_estimate.estimated_time - timedelta(hours=2),
                    end_time=drift_result.origin_estimate.estimated_time + timedelta(hours=2)
                )
                
                mmsis = list(set([r.vessel_id for r in records if r.vessel_id]))
                identities = await self.gfw_provider.get_vessel_identities(mmsis)
                
                target['gfw_records'] = records
                target['gfw_identities'] = identities
                job.provenance_references.append("GFW:LIVE")
            except Exception as e:
                logger.error(f"GFW Vessel search failed: {e}", exc_info=True)
                job.provenance_references.append("GFW:UNAVAILABLE")

        job.status = JobStatus.ATTRIBUTION

    async def _handle_attribution(self, job: MonitoringJob):
        ctx = self._get_context(job.job_id)
        targets = ctx.get('investigation_targets', [])
        
        for target in targets:
            drift_result: Optional[DriftResult] = target.get('drift_result')
            gfw_identities = target.get('gfw_identities', [])
            
            # Note: Attribution service needs VesselCandidate list.
            # Since GFW doesn't provide tracks, we construct minimal VesselCandidates.
            candidates = []
            
            # This is a simplification. A real impl would map GFW Presence to VesselCandidate.
            # We skip heavy track creation here and just pass empty tracks to evaluate.
            # Evaluate expects `track`, `identity`, `spatially_relevant`, `temporally_relevant`, etc.
            # Since evaluate signature requires them, we construct them loosely.
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
                job.provenance_references.append("ATTRIBUTION:LIVE")
                
        job.status = JobStatus.REPORT_READY


# Singleton Orchestrator
orchestrator = OrchestrationService()
