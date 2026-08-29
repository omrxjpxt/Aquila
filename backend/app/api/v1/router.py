from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("/status")
async def get_status():
    """
    Returns the status of the AQUILA scientific engine and its services.
    """
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "modules": {
            "satellite_ingest": "ready",
            "ml_detection": "ready",
            "drift_engine": "ready",
            "ais_attribution": "ready"
        }
    }
