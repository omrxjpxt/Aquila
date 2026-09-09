from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Dict, Any, Optional
from app.api.deps import get_current_user, enforce_ownership
from app.services.repositories.factory import get_monitoring_zone_repository, get_job_repository
from app.schemas.monitoring import MonitoringZone
from app.schemas.orchestration import MonitoringJob, JobStatus

router = APIRouter()

@router.get("/zones", response_model=List[MonitoringZone])
async def list_monitoring_zones(user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_monitoring_zone_repository()
    # In a real app we'd query by owner_uid. For now we filter in-memory if repo lacks it,
    # or rely on repo's filter. The SQLiteMonitoringZoneRepository has get_enabled_zones.
    # Let's get all enabled zones and filter by user.uid
    zones = repo.get_enabled_zones()
    return [z for z in zones if z.owner_uid == user.get("uid") or z.owner_uid == "SYSTEM"]

@router.get("/jobs", response_model=List[MonitoringJob])
async def list_monitoring_jobs(
    status: Optional[JobStatus] = None,
    limit: int = Query(50, ge=1, le=100),
    user: Dict[str, Any] = Depends(get_current_user)
):
    repo = get_job_repository()
    # Current repository interfaces don't have list_all or list_by_owner.
    # We can get_jobs_by_status and filter, or we might need to add a generic list_jobs method.
    # To keep it simple, if status is given, we use get_jobs_by_status.
    # If not, we might need to get all statuses.
    if status:
        jobs = repo.get_jobs_by_status([status])
    else:
        jobs = repo.get_jobs_by_status(list(JobStatus))
        
    # Sort descending by created_at
    jobs.sort(key=lambda j: j.created_at, reverse=True)
    
    # Filter by ownership
    user_jobs = [j for j in jobs if j.owner_uid == user.get("uid")][:limit]
    return user_jobs

@router.get("/jobs/{job_id}", response_model=MonitoringJob)
async def get_monitoring_job(job_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    repo = get_job_repository()
    job = repo.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    enforce_ownership(user, job.owner_uid)
    return job
