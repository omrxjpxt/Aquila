from fastapi import APIRouter, Depends
from app.core.config import settings
from app.api.deps import get_current_user

from .satellite import router as satellite_router
from .analysis import router as analysis_router
from .drift import router as drift_router
from .ais import router as ais_router
from .attribution import router as attribution_router
from .simulation import router as simulation_router
from .monitoring import router as monitoring_router
from .investigations import router as investigations_router

router = APIRouter()

router.include_router(satellite_router, dependencies=[Depends(get_current_user)])
router.include_router(analysis_router, dependencies=[Depends(get_current_user)])
router.include_router(drift_router, dependencies=[Depends(get_current_user)])
router.include_router(ais_router, prefix="/ais", tags=["ais"], dependencies=[Depends(get_current_user)])
router.include_router(attribution_router, prefix="/attribution", tags=["attribution"], dependencies=[Depends(get_current_user)])
router.include_router(simulation_router, prefix="/simulation", tags=["simulation"], dependencies=[Depends(get_current_user)])
router.include_router(monitoring_router, prefix="/monitoring", tags=["monitoring"], dependencies=[Depends(get_current_user)])
router.include_router(investigations_router, prefix="/investigations", tags=["investigations"], dependencies=[Depends(get_current_user)])
