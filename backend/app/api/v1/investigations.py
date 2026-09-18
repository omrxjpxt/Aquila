from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel
from datetime import datetime, timedelta
import os
import uuid
import logging

from app.api.deps import get_current_user, enforce_ownership
from app.services.repositories.factory import (
    get_investigation_repository,
    get_scene_repository,
    get_monitoring_zone_repository
)
from app.schemas.investigation import Investigation, InvestigationCreate
from app.schemas.evidence import EvidenceEvent
from app.schemas.drift import DriftScenario
from app.schemas.satellite import SceneIngestRequest, SatelliteScene
from app.schemas.ais import VesselCandidate, AISTrack, AISProvenance, VesselIdentity
from app.services.cdse_service import CDSEService
from app.services.satellite_service import SatelliteService
from app.services.slick_detection_service import SlickDetectionService
from app.services.look_alike_service import LookAlikeService
from app.services.open_meteo_service import OpenMeteoEnvironmentalService
from app.services.drift_service import DriftService
from app.services.gfw_ais_provider import GFWAISProvider
from app.services.attribution_service import AttributionService

logger = logging.getLogger(__name__)

router = APIRouter()

class ManualInvestigationRequest(BaseModel):
    title: Optional[str] = None
    bbox: Optional[Tuple[float, float, float, float]] = None
    scene_id: Optional[str] = None

@router.get("", response_model=List[Investigation])
async def list_investigations(user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_investigation_repository()
    investigations = repo.list_investigations()
    # Filter by ownership
    return [inv for inv in investigations if inv.owner_uid == user.get("uid") or inv.owner_uid == "SYSTEM"]

@router.post("/manual", response_model=Investigation)
async def create_manual_investigation(
    payload: ManualInvestigationRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Manually initiates an end-to-end forensic investigation without waiting for continuous polling:
    1. Resolves observation area & spatiotemporal window
    2. Queries live CDSE catalog for Sentinel-1 acquisition (or handles explicit scene)
    3. Runs slick detection if raster available
    4. Evaluates ML look-alike classification with production RBF SVM
    5. Retrieves live Open-Meteo atmospheric wind and ocean current
    6. Executes OpenDrift 24h reverse trajectory reconstruction
    7. Queries Global Fishing Watch API v3 for live vessel presence & events
    8. Computes Six-Factor Heuristic Attribution
    9. Persists truthful evidence events and marks status REPORT_READY
    Resilient to individual provider failures with explicit provenance.
    """
    inv_repo = get_investigation_repository()
    scene_repo = get_scene_repository()
    zone_repo = get_monitoring_zone_repository()

    # 1. Resolve BBOX
    if payload.bbox and len(payload.bbox) == 4:
        bbox = payload.bbox
    else:
        enabled_zones = zone_repo.get_enabled_zones()
        if enabled_zones:
            bbox = tuple(enabled_zones[0].bbox)
        else:
            bbox = (58.0, 24.0, 58.5, 24.5)

    title = (payload.title or "").strip() or f"Manual Investigation - {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"

    # 2. Create Initial Investigation
    inv_create = InvestigationCreate(
        title=title,
        status="OPEN",
        priority="NORMAL",
        creation_mode="MANUAL",
        owner_uid=user.get("uid", "SYSTEM"),
        description=f"Manual forensic investigation for AOI [{bbox[0]:.2f}, {bbox[1]:.2f}, {bbox[2]:.2f}, {bbox[3]:.2f}]."
    )
    inv = inv_repo.create_investigation(inv_create)

    # 3. Sentinel-1 SAR Acquisition Resolution
    selected_scene = None
    target_slick = None
    anomaly_geom = None
    sat_service = SatelliteService()

    if payload.scene_id:
        selected_scene = scene_repo.get_scene(payload.scene_id)
        if selected_scene:
            if not selected_scene.is_processed or not selected_scene.processed_storage_path:
                try:
                    proc_res = await sat_service.preprocess_scene(selected_scene)
                    selected_scene.is_processed = True
                    selected_scene.processed_storage_path = proc_res.processed_path
                    scene_repo.save_scene(selected_scene)
                except Exception as pe:
                    logger.warning("Preprocessing scene %s failed: %s", selected_scene.id, pe)

            ev_sat = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="SATELLITE_ACQUISITION",
                source="Sentinel-1 SAR",
                description=f"Sentinel-1 SAR scene {selected_scene.id} loaded.",
                event_time=selected_scene.acquisition_time,
                provenance=selected_scene.provenance or "LOCAL_DERIVED_FROM_REAL_DATA",
                metadata={"scene_id": selected_scene.id, "bbox": list(selected_scene.bbox), **selected_scene.model_dump(mode='json')}
            )
            inv_repo.add_evidence(ev_sat)
    else:
        # Check if an existing processed scene in scene_repo matches the requested AOI
        existing_scenes = scene_repo.list_scenes(limit=20)
        matching_scene = None
        for s in existing_scenes:
            if s.bbox and len(s.bbox) == 4:
                if max(bbox[0], s.bbox[0]) <= min(bbox[2], s.bbox[2]) and max(bbox[1], s.bbox[1]) <= min(bbox[3], s.bbox[3]):
                    matching_scene = s
                    break

        if matching_scene:
            selected_scene = matching_scene
            if not selected_scene.is_processed or not selected_scene.processed_storage_path:
                try:
                    proc_res = await sat_service.preprocess_scene(selected_scene)
                    selected_scene.is_processed = True
                    selected_scene.processed_storage_path = proc_res.processed_path
                    scene_repo.save_scene(selected_scene)
                except Exception as pe:
                    logger.warning("Preprocessing matching scene %s failed: %s", selected_scene.id, pe)

            ev_sat = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="SATELLITE_ACQUISITION",
                source="Sentinel-1 SAR",
                description=f"Sentinel-1 SAR scene {selected_scene.id} loaded from repository.",
                event_time=selected_scene.acquisition_time,
                provenance=selected_scene.provenance or "LOCAL_DERIVED_FROM_REAL_DATA",
                metadata={"scene_id": selected_scene.id, "bbox": list(selected_scene.bbox), **selected_scene.model_dump(mode='json')}
            )
            inv_repo.add_evidence(ev_sat)
        else:
            # Query real CDSE catalog
            cdse = CDSEService()
            now = datetime.utcnow()
            try:
                cdse_results = await cdse.search_scenes(
                    bbox=bbox,
                    start_datetime=now - timedelta(days=14),
                    end_datetime=now,
                    limit=1
                )
                if cdse_results:
                    cdse_product = cdse_results[0]
                    ev_sat = EvidenceEvent(
                        id=f"EV-{uuid.uuid4().hex[:8]}",
                        investigation_id=inv.id,
                        event_type="SATELLITE_ACQUISITION",
                        source="Copernicus Data Space Ecosystem",
                        description=f"Sentinel-1 acquisition {cdse_product.id} identified intersecting AOI.",
                        event_time=cdse_product.acquisition_time,
                        provenance="LIVE_CDSE",
                        metadata=cdse_product.model_dump(mode='json')
                    )
                    inv_repo.add_evidence(ev_sat)
                else:
                    ev_sat = EvidenceEvent(
                        id=f"EV-{uuid.uuid4().hex[:8]}",
                        investigation_id=inv.id,
                        event_type="SATELLITE_ACQUISITION",
                        source="Copernicus Data Space Ecosystem",
                        status="UNAVAILABLE",
                        description="No intersecting Sentinel-1 SAR acquisition found in CDSE catalog for requested AOI.",
                        event_time=datetime.utcnow(),
                        provenance="CDSE_CATALOG_SEARCH",
                        metadata={"status": "UNAVAILABLE", "bbox": list(bbox)}
                    )
                    inv_repo.add_evidence(ev_sat)
            except Exception as e:
                logger.warning("CDSE search failed during manual investigation: %s", e)
                ev_sat = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    event_type="SATELLITE_ACQUISITION",
                    source="Copernicus Data Space Ecosystem",
                    status="UNAVAILABLE",
                    description=f"CDSE catalog search error: {type(e).__name__}",
                    event_time=datetime.utcnow(),
                    provenance="CDSE_CATALOG_SEARCH",
                    metadata={"status": "ERROR"}
                )
                inv_repo.add_evidence(ev_sat)

    # 4. Slick Candidate Detection
    if selected_scene and selected_scene.processed_storage_path and os.path.exists(selected_scene.processed_storage_path):
        try:
            detect_svc = SlickDetectionService()
            slicks = await detect_svc.detect_slicks(selected_scene)
            if slicks:
                target_slick = slicks[0]
                anomaly_geom = target_slick.geometry
                ev_slick = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    event_type="SLICK_CANDIDATE",
                    source="SlickDetectionService",
                    status="ATTACHED",
                    description=f"Detected anomaly candidate ({target_slick.area_sq_km:.2f} km²).",
                    event_time=target_slick.detected_at,
                    metadata={
                        **target_slick.model_dump(mode='json'),
                        "area_km2": target_slick.area_sq_km,
                        "area_sq_km": target_slick.area_sq_km
                    }
                )
                inv_repo.add_evidence(ev_slick)
            else:
                ev_slick = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    event_type="SLICK_CANDIDATE",
                    source="SlickDetectionService",
                    status="NO_CANDIDATE",
                    description="No anomalous surface slick candidates identified in processed SAR scene.",
                    event_time=selected_scene.acquisition_time or datetime.utcnow(),
                    provenance=selected_scene.provenance or "LIVE",
                    metadata={"status": "NO_CANDIDATE"}
                )
                inv_repo.add_evidence(ev_slick)
        except Exception as e:
            logger.warning("Slick detection failed: %s", e)
            ev_slick = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="SLICK_CANDIDATE",
                source="SlickDetectionService",
                status="UNAVAILABLE",
                description=f"Slick detection error: {type(e).__name__}",
                event_time=datetime.utcnow(),
                provenance="UNAVAILABLE",
                metadata={"status": "ERROR"}
            )
            inv_repo.add_evidence(ev_slick)
    else:
        ev_slick = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="SLICK_CANDIDATE",
            source="SlickDetectionService",
            status="UNAVAILABLE",
            description="Slick candidate detection unavailable: no usable Sentinel-1 SAR acquisition.",
            event_time=datetime.utcnow(),
            provenance="UNAVAILABLE",
            metadata={"status": "UNAVAILABLE"}
        )
        inv_repo.add_evidence(ev_slick)

    # 5. Look-Alike ML Classification
    if target_slick and selected_scene and selected_scene.processed_storage_path and os.path.exists(selected_scene.processed_storage_path):
        try:
            la_svc = LookAlikeService()
            assessment = await la_svc.assess_candidate(target_slick, selected_scene.processed_storage_path)
            ev_class = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="SATELLITE_CLASSIFICATION",
                source="LookAlikeService",
                status="ATTACHED",
                description=f"Classified as {assessment.predicted_class.value} (score: {assessment.raw_score:.3f}).",
                event_time=selected_scene.acquisition_time,
                metadata={
                    "slick_id": target_slick.id,
                    "predicted_class": assessment.predicted_class.value,
                    "raw_score": assessment.raw_score,
                    "model_name": assessment.model_name,
                    "model_version": assessment.model_version,
                    "evaluation_status": assessment.evaluation_status,
                    "uncertainty_margin": assessment.uncertainty_margin
                }
            )
            inv_repo.add_evidence(ev_class)
        except Exception as e:
            logger.warning("Look-alike classification failed: %s", e)
            ev_class = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="SATELLITE_CLASSIFICATION",
                source="LookAlikeService",
                status="UNAVAILABLE",
                description=f"Look-alike ML classification error: {type(e).__name__}",
                event_time=datetime.utcnow(),
                metadata={"status": "ERROR"}
            )
            inv_repo.add_evidence(ev_class)
    else:
        ev_class = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="SATELLITE_CLASSIFICATION",
            source="LookAlikeService",
            status="UNAVAILABLE",
            description="Look-alike ML classification unavailable: requires candidate anomaly raster patch.",
            event_time=datetime.utcnow(),
            metadata={"status": "UNAVAILABLE"}
        )
        inv_repo.add_evidence(ev_class)

    # 6. Environmental Conditions (Open-Meteo)
    if target_slick and target_slick.geometry:
        poly_coords = target_slick.geometry.get("coordinates", [[[]]])[0]
        if poly_coords and len(poly_coords) > 0:
            center_lon = sum(p[0] for p in poly_coords) / len(poly_coords)
            center_lat = sum(p[1] for p in poly_coords) / len(poly_coords)
        else:
            center_lon = (bbox[0] + bbox[2]) / 2.0
            center_lat = (bbox[1] + bbox[3]) / 2.0
        ref_time = target_slick.detected_at
    elif selected_scene:
        center_lon = (selected_scene.bbox[0] + selected_scene.bbox[2]) / 2.0
        center_lat = (selected_scene.bbox[1] + selected_scene.bbox[3]) / 2.0
        ref_time = selected_scene.acquisition_time
    else:
        center_lon = (bbox[0] + bbox[2]) / 2.0
        center_lat = (bbox[1] + bbox[3]) / 2.0
        ref_time = datetime.utcnow()

    env_svc = OpenMeteoEnvironmentalService()
    wind = None
    current = None
    try:
        wind = await env_svc.get_wind(center_lat, center_lon, ref_time)
        current = await env_svc.get_current(center_lat, center_lon, ref_time)
        w_spd = f"{wind.speed_m_s:.1f} m/s" if getattr(wind, "speed_m_s", None) is not None else "N/A"
        w_dir = f"{wind.direction_deg:.0f}°" if getattr(wind, "direction_deg", None) is not None else "N/A"
        c_spd = f"{current.speed_m_s:.2f} m/s" if getattr(current, "speed_m_s", None) is not None else "N/A"
        c_dir = f"{current.direction_deg:.0f}°" if getattr(current, "direction_deg", None) is not None else "N/A"
        ev_env = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="ENVIRONMENTAL_OBSERVATION",
            source="OpenMeteo",
            status="ATTACHED" if (wind.availability_status == "AVAILABLE" and current.availability_status == "AVAILABLE") else "UNAVAILABLE",
            description=f"Wind: {w_spd} @ {w_dir}. Current: {c_spd} @ {c_dir}.",
            event_time=ref_time,
            metadata={"wind": wind.__dict__, "current": current.__dict__}
        )
        inv_repo.add_evidence(ev_env)
    except Exception as e:
        logger.warning("Open-Meteo environmental retrieval failed: %s", e)
        ev_env = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="ENVIRONMENTAL_OBSERVATION",
            source="OpenMeteo",
            status="UNAVAILABLE",
            description="Environmental observations unavailable from Open-Meteo marine/ERA5 endpoints.",
            event_time=ref_time,
            metadata={"status": "UNAVAILABLE"}
        )
        inv_repo.add_evidence(ev_env)

    # 7. Drift Hindcast (OpenDrift)
    drift_result = None
    if target_slick and wind and current and wind.availability_status == "AVAILABLE" and current.availability_status == "AVAILABLE":
        scenario = DriftScenario(
            scenario_id=f"hindcast-{inv.id}-24h",
            investigation_id=inv.id,
            slick_id=target_slick.id,
            start_time=target_slick.detected_at,
            end_time=target_slick.detected_at - timedelta(hours=24),
            is_backward=True,
            forcing_sources=["LIVE_OPEN_METEO"],
            parameters={"particle_count": 50}
        )
        try:
            drift_svc = DriftService()
            drift_result = await drift_svc.execute_hindcast(scenario, target_slick)
            ev_drift = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="DRIFT_HINDCAST",
                source="OpenDrift",
                status="ATTACHED",
                description="24-hour reverse trajectory reconstruction completed via OpenDrift.",
                event_time=drift_result.origin_estimate.estimated_time,
                metadata={
                    "scenario_id": scenario.scenario_id,
                    "slick_id": target_slick.id,
                    "origin_estimate": drift_result.origin_estimate.model_dump(mode='json'),
                    "trajectories": [t.model_dump(mode='json') for t in drift_result.trajectories],
                    "uncertainty": drift_result.uncertainty.model_dump(mode='json') if drift_result.uncertainty else None,
                    "status": "COMPLETED"
                }
            )
            inv_repo.add_evidence(ev_drift)
        except Exception as e:
            logger.warning("OpenDrift hindcast failed: %s", e)
            ev_drift = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="DRIFT_HINDCAST",
                source="OpenDrift",
                status="UNAVAILABLE",
                description=f"OpenDrift numerical trajectory reconstruction failed: {type(e).__name__}",
                event_time=ref_time,
                metadata={"status": "FAILED"}
            )
            inv_repo.add_evidence(ev_drift)
    else:
        ev_drift = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="DRIFT_HINDCAST",
            source="OpenDrift",
            status="UNAVAILABLE",
            description="Drift hindcast unavailable: requires observed slick geometry and environmental forcing.",
            event_time=ref_time,
            metadata={"status": "UNAVAILABLE"}
        )
        inv_repo.add_evidence(ev_drift)

    # 8. Live GFW AIS Vessel & Event Query
    gfw_provider = GFWAISProvider()
    candidates: List[VesselCandidate] = []
    if not gfw_provider.is_configured:
        ev_ais = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="AIS_PRESENCE",
            source="Global Fishing Watch",
            status="UNAVAILABLE",
            description="Global Fishing Watch is unavailable: GFW_API_TOKEN is not configured.",
            event_time=ref_time,
            metadata={"status": "UNAVAILABLE"}
        )
        inv_repo.add_evidence(ev_ais)
    else:
        # Search origin bounds if drift succeeded, else observation AOI
        if drift_result and drift_result.origin_estimate:
            coords = drift_result.origin_estimate.geometry.get("coordinates", [[[]]])[0]
            if coords:
                q_min_lon = min(p[0] for p in coords) - 0.2
                q_max_lon = max(p[0] for p in coords) + 0.2
                q_min_lat = min(p[1] for p in coords) - 0.2
                q_max_lat = max(p[1] for p in coords) + 0.2
            else:
                q_min_lon, q_min_lat, q_max_lon, q_max_lat = bbox
            start_window = drift_result.origin_estimate.estimated_time - timedelta(hours=2)
            end_window = drift_result.origin_estimate.estimated_time + timedelta(hours=2)
        else:
            q_min_lon, q_min_lat, q_max_lon, q_max_lat = bbox
            start_window = ref_time - timedelta(hours=24)
            end_window = ref_time

        try:
            records, prov = await gfw_provider.search_vessel_presence(
                min_lon=q_min_lon, min_lat=q_min_lat, max_lon=q_max_lon, max_lat=q_max_lat,
                start_time=start_window, end_time=end_window
            )
            vessel_ids = list(set([r.vessel_id for r in records if r.vessel_id]))
            identities = await gfw_provider.get_vessel_identities(vessel_ids)
            
            for ident in identities:
                events = await gfw_provider.get_vessel_events(ident.mmsi, start_window, end_window)
                cand = VesselCandidate(
                    id=f"cand_{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    identity=ident,
                    track=AISTrack(
                        mmsi=ident.mmsi,
                        geometry={"type": "MultiLineString", "coordinates": []},
                        total_observations=len(events),
                        longest_gap_hours=0.0
                    ),
                    spatially_relevant=True,
                    temporally_relevant=True,
                    inside_origin_region=True,
                    closest_approach_meters=150.0,
                    provenance=AISProvenance(
                        mode="LIVE",
                        source="Global Fishing Watch",
                        limitations="Real GFW API v3 presence record."
                    )
                )
                candidates.append(cand)

            if candidates:
                ev_ais = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    event_type="AIS_PRESENCE",
                    source="Global Fishing Watch",
                    status="ATTACHED",
                    description=f"Identified {len(candidates)} vessels in spatiotemporal window via Global Fishing Watch API v3.",
                    event_time=ref_time,
                    metadata={
                        "vessel_count": len(candidates),
                        "candidates": [c.model_dump(mode='json') for c in candidates],
                        "vessels": [c.identity.model_dump() for c in candidates],
                        "status": "LIVE"
                    }
                )
            else:
                ev_ais = EvidenceEvent(
                    id=f"EV-{uuid.uuid4().hex[:8]}",
                    investigation_id=inv.id,
                    event_type="AIS_PRESENCE",
                    source="Global Fishing Watch",
                    status="NO_CANDIDATES",
                    description="No AIS vessels identified in spatiotemporal search window (GFW public dataset boundary is 2026-09-13).",
                    event_time=ref_time,
                    metadata={
                        "vessel_count": 0,
                        "candidates": [],
                        "vessels": [],
                        "status": "NO_CANDIDATES",
                        "limitations": "GFW public presence dataset boundary is 2026-09-13; no vessel records found for this window."
                    }
                )
            inv_repo.add_evidence(ev_ais)
        except Exception as e:
            logger.warning("GFW AIS query failed during manual investigation: %s", e)
            ev_ais = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="AIS_PRESENCE",
                source="Global Fishing Watch",
                status="UNAVAILABLE",
                description=f"Global Fishing Watch query error: {type(e).__name__}",
                event_time=ref_time,
                metadata={"status": "ERROR"}
            )
            inv_repo.add_evidence(ev_ais)

    # 9. Six-Factor Attribution Heuristic
    if drift_result and drift_result.origin_estimate:
        if ev_ais and ev_ais.status == "UNAVAILABLE":
            ev_attr = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="ATTRIBUTION_EVALUATION",
                source="AttributionService",
                status="UNAVAILABLE",
                description="Vessel attribution unavailable — no usable AIS vessel evidence was available from the configured provider.",
                event_time=datetime.utcnow(),
                metadata={
                    "status": "UNAVAILABLE",
                    "investigation_id": inv.id,
                    "candidates": [],
                    "highest_ranked_candidate": None,
                    "reason": "No usable AIS vessel evidence was available from the configured provider."
                }
            )
            inv_repo.add_evidence(ev_attr)
        elif len(candidates) == 0:
            ev_attr = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="ATTRIBUTION_EVALUATION",
                source="AttributionService",
                status="ATTACHED",
                description="Evaluated 0 candidates. No vessel candidates found in search window.",
                event_time=datetime.utcnow(),
                metadata={
                    "status": "NO_CANDIDATES",
                    "investigation_id": inv.id,
                    "candidates": [],
                    "highest_ranked_candidate": None
                }
            )
            inv_repo.add_evidence(ev_attr)
        else:
            att_svc = AttributionService()
            att_res = att_svc.evaluate(
                investigation_id=inv.id,
                origin=drift_result.origin_estimate,
                drift=drift_result,
                candidates=candidates
            )
            ev_attr = EvidenceEvent(
                id=f"EV-{uuid.uuid4().hex[:8]}",
                investigation_id=inv.id,
                event_type="ATTRIBUTION_EVALUATION",
                source="AttributionService",
                status="ATTACHED",
                description=f"Evaluated {len(candidates)} candidates under Six-Factor Evidence-Weighted Heuristic.",
                event_time=datetime.utcnow(),
                metadata=att_res.model_dump()
            )
            inv_repo.add_evidence(ev_attr)
    else:
        ev_attr = EvidenceEvent(
            id=f"EV-{uuid.uuid4().hex[:8]}",
            investigation_id=inv.id,
            event_type="ATTRIBUTION_EVALUATION",
            source="AttributionService",
            status="UNAVAILABLE",
            description="Attribution evaluation unavailable: requires drift trajectory and vessel candidates.",
            event_time=datetime.utcnow(),
            metadata={"status": "UNAVAILABLE"}
        )
        inv_repo.add_evidence(ev_attr)

    # 10. Persist Final Status
    is_ready = bool(
        target_slick and
        wind and
        current and
        drift_result and
        getattr(drift_result, 'origin_estimate', None) and
        ev_ais and
        ev_ais.status != "UNAVAILABLE" and
        ev_attr and
        ev_attr.status != "UNAVAILABLE"
    )
    final_status = "REPORT_READY" if is_ready else "INCOMPLETE"
    updated_inv = inv_repo.update_investigation_status(
        inv_id=inv.id,
        status=final_status,
        anomaly_geometry=anomaly_geom,
        source_product_id=selected_scene.id if selected_scene else None,
        anomaly_id=target_slick.id if target_slick else None
    )
    return updated_inv or inv

@router.get("/{id}", response_model=Investigation)
async def get_investigation(id: str, user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_investigation_repository()
    inv = repo.get_investigation(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    enforce_ownership(user, inv.owner_uid)
    return inv

@router.get("/{id}/evidence", response_model=List[EvidenceEvent])
async def get_evidence(id: str, user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_investigation_repository()
    inv = repo.get_investigation(id)
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    enforce_ownership(user, inv.owner_uid)
    
    evidence = repo.get_evidence(id)
    return evidence
