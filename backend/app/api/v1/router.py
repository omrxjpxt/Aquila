from fastapi import APIRouter
from app.core.config import settings

from .satellite import router as satellite_router
from .analysis import router as analysis_router
from .drift import router as drift_router
from .ais import router as ais_router
from .attribution import router as attribution_router
from .simulation import router as simulation_router

router = APIRouter()

router.include_router(satellite_router)
router.include_router(analysis_router)
router.include_router(drift_router)
router.include_router(ais_router, prefix="/ais", tags=["ais"])
router.include_router(attribution_router, prefix="/attribution", tags=["attribution"])
router.include_router(simulation_router, prefix="/simulation", tags=["simulation"])


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
