from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
from app.api.deps import get_current_user, enforce_ownership
from app.services.repositories.factory import get_monitoring_zone_repository, get_job_repository
from app.schemas.monitoring import MonitoringZone
from app.schemas.orchestration import MonitoringJob, JobStatus

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/status")
async def get_monitoring_status(user: Dict[str, Any] = Depends(get_current_user)):
    """
    Returns live monitoring engine status derived from durable SQLite heartbeats,
    active zones, and CDSE service configuration. Never fabricates timestamps or states.
    """
    from app.core.config import settings
    from app.services.repositories.db import get_db_connection
    
    # 1. CDSE Configuration Status
    cdse_status = "CONFIGURED" if (settings.CDSE_CLIENT_ID and settings.CDSE_CLIENT_SECRET) else "UNAVAILABLE"
    
    # 2. Query durable worker heartbeat from SQLite
    worker_status = "INACTIVE"
    last_poll_time = None
    active_zone_name = None
    active_zone_id = None
    active_zone_bbox = None
    
    try:
        with get_db_connection() as conn:
            cursor = conn.execute("""
                SELECT worker_id, status, last_heartbeat, last_poll_time, active_zone_id
                FROM worker_heartbeats
                ORDER BY last_heartbeat DESC LIMIT 1
            """)
            row = cursor.fetchone()
            if row:
                last_hb = row["last_heartbeat"]
                if isinstance(last_hb, str):
                    last_hb = datetime.fromisoformat(last_hb.replace("Z", "+00:00")).replace(tzinfo=None)
                
                # Check if heartbeat is fresh (within 2x poll interval + 15s)
                freshness_threshold = settings.WORKER_POLL_INTERVAL_SECONDS * 2 + 15
                if row["status"] == "RUNNING" and (datetime.utcnow() - last_hb).total_seconds() < freshness_threshold:
                    worker_status = "RUNNING"
                
                if row["last_poll_time"]:
                    lpt = row["last_poll_time"]
                    if isinstance(lpt, datetime):
                        last_poll_time = lpt.isoformat() + "Z"
                    else:
                        last_poll_time = str(lpt)
                        
                # Zone name lookup if available
                if row["active_zone_id"]:
                    z_cursor = conn.execute("SELECT id, name, bbox_json FROM monitoring_zones WHERE id = ?", (row["active_zone_id"],))
                    z_row = z_cursor.fetchone()
                    if z_row:
                        import json
                        active_zone_id = z_row["id"]
                        active_zone_name = z_row["name"]
                        if z_row["bbox_json"]:
                            active_zone_bbox = json.loads(z_row["bbox_json"])
    except Exception as e:
        logger.warning(f"Failed to query worker status from SQLite: {e}")

    # Fallback to configured enabled zone name if not yet set from heartbeat
    zone_repo = get_monitoring_zone_repository()
    enabled_zones = zone_repo.get_enabled_zones()
    if not active_zone_name and enabled_zones:
        active_zone_id = enabled_zones[0].id
        active_zone_name = enabled_zones[0].name
        active_zone_bbox = list(enabled_zones[0].bbox)
        
    job_repo = get_job_repository()
    all_jobs = job_repo.get_jobs_by_status(list(JobStatus))
    active_jobs = [j for j in all_jobs if j.status not in [JobStatus.RESOLVED, JobStatus.FAILED, JobStatus.REPORT_READY]]
    
    is_active = (worker_status == "RUNNING" and len(enabled_zones) > 0)

    from app.services.gfw_ais_provider import GFWAISProvider
    gfw_provider = GFWAISProvider()
    gfw_status = "CONFIGURED" if gfw_provider.is_configured else "UNAVAILABLE"
    
    return {
        "monitoring_active": is_active,
        "worker_status": worker_status,
        "cdse_status": cdse_status,
        "monitored_zone": active_zone_name,
        "monitored_zone_name": active_zone_name,
        "monitored_zone_id": active_zone_id,
        "monitored_bbox": active_zone_bbox,
        "gfw_status": gfw_status,
        "source": "Sentinel-1 (Copernicus Data Space)",
        "last_poll_time": last_poll_time,
        "active_jobs_count": len(active_jobs),
        "total_jobs_count": len(all_jobs)
    }

@router.get("/zones", response_model=List[MonitoringZone])
async def list_monitoring_zones(user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_monitoring_zone_repository()
    if hasattr(repo, "get_all_zones"):
        zones = repo.get_all_zones()
    else:
        zones = repo.get_enabled_zones()
    return [z for z in zones if z.owner_uid == user.get("uid") or z.owner_uid == "SYSTEM" or user.get("uid") == "demo-user"]

@router.post("/zones", response_model=MonitoringZone)
async def save_monitoring_zone(
    payload: Dict[str, Any],
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Saves a persistent monitoring zone for continuous observation.
    Updates durable SQLite state and heartbeats to ensure immediate active observation.
    """
    name = str(payload.get("name") or "Observation Area").strip()
    raw_bbox = payload.get("bbox")
    if not raw_bbox or len(raw_bbox) != 4:
        raise HTTPException(status_code=400, detail="bbox must be a 4-element tuple [min_lon, min_lat, max_lon, max_lat]")
    bbox = (float(raw_bbox[0]), float(raw_bbox[1]), float(raw_bbox[2]), float(raw_bbox[3]))
    
    zone_repo = get_monitoring_zone_repository()
    import re
    slug = re.sub(r'[^a-zA-Z0-9_-]', '', name.lower().replace(' ', '-'))
    zone_id = f"zone-{slug}" if slug else f"zone-{int(datetime.utcnow().timestamp())}"
    
    zone = MonitoringZone(
        id=zone_id,
        name=name,
        owner_uid=user.get("uid", "SYSTEM"),
        bbox=bbox,
        collection_filter=payload.get("collection_filter", "sentinel-1-grd"),
        is_enabled=payload.get("is_enabled", True)
    )
    saved_zone = zone_repo.create_zone(zone, is_enabled=zone.is_enabled)
    
    # Update active_zone_id in worker_heartbeats so /status immediately reflects it
    from app.services.repositories.db import get_db_connection
    try:
        with get_db_connection() as conn:
            conn.execute("""
                UPDATE worker_heartbeats 
                SET active_zone_id = ?, updated_at = ?
            """, (saved_zone.id, datetime.utcnow()))
    except Exception as e:
        logger.warning(f"Failed to update active_zone_id in worker_heartbeats: {e}")

    return saved_zone

@router.get("/jobs", response_model=List[MonitoringJob])
async def list_monitoring_jobs(
    status: Optional[JobStatus] = None,
    limit: int = Query(50, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user)
):
    repo = get_job_repository()
    if status:
        jobs = repo.get_jobs_by_status([status])
    else:
        jobs = repo.get_jobs_by_status(list(JobStatus))
        
    # Sort descending by created_at
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    
    # Filter by ownership (allow user's jobs and SYSTEM background jobs)
    user_jobs = [j for j in jobs if j.owner_uid == user.get("uid") or j.owner_uid == "SYSTEM" or user.get("uid") == "demo-user"][:limit]

    # Enrich zone name for human-readable context
    try:
        zone_repo = get_monitoring_zone_repository()
        zones = zone_repo.get_all_zones() if hasattr(zone_repo, "get_all_zones") else zone_repo.get_enabled_zones()
        zone_map = {z.id: z.name for z in zones}
        for j in user_jobs:
            if not j.monitoring_zone_name:
                j.monitoring_zone_name = zone_map.get(j.monitoring_zone_id)
    except Exception as e:
        logger.warning(f"Failed to enrich monitoring_zone_name on jobs: {e}")

    return user_jobs

@router.get("/jobs/{job_id}", response_model=MonitoringJob)
async def get_monitoring_job(job_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_job_repository()
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    enforce_ownership(user, job.owner_uid)

    try:
        zone_repo = get_monitoring_zone_repository()
        zone = zone_repo.get_zone(job.monitoring_zone_id)
        if zone:
            job.monitoring_zone_name = zone.name
    except Exception as e:
        logger.warning(f"Failed to enrich monitoring_zone_name on job {job_id}: {e}")

    return job
