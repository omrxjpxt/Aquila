from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.core.config import settings
from app.schemas.analysis import RealSceneAnalysisResult
from app.schemas.look_alike import LookAlikeAssessment, LookAlikeRequest
from app.schemas.evidence_fusion import EvidenceFusionResult, EvidenceFusionRequest
from app.schemas.slick import Slick
from app.services.real_scene_analysis_service import RealSceneAnalysisService
from app.services.look_alike_service import LookAlikeService
from app.services.evidence_fusion_service import EvidenceFusionService
from app.services.open_meteo_service import OpenMeteoEnvironmentalService
from app.services.environmental_data_service import MockEnvironmentalDataService
from app.services.repositories.factory import get_scene_repository

router = APIRouter(prefix="/analysis", tags=["analysis"])

class RealSceneAnalysisRequest(BaseModel):
    scene_id: str = Field(..., description="ID of the processed real scene")

def get_real_scene_analysis_service():
    return RealSceneAnalysisService()

@router.post("/real-scene", response_model=RealSceneAnalysisResult)
async def analyze_real_scene(
    request: RealSceneAnalysisRequest,
    service: RealSceneAnalysisService = Depends(get_real_scene_analysis_service)
):
    """
    Run the entire real-scene baseline analysis pipeline on a LIVE CDSE raster.
    """
    scene = get_scene_repository().get_scene(request.scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene '{request.scene_id}' not found")
        
    if scene.provenance != "LIVE":
        raise HTTPException(
            status_code=400, 
            detail=f"Scene '{request.scene_id}' has provenance '{scene.provenance}'. This endpoint requires a LIVE scene."
        )
        
    try:
        result = await service.analyze_real_scene(scene)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/look-alike", response_model=LookAlikeAssessment)
async def assess_look_alike(request: LookAlikeRequest):
    """
    Classify a candidate dark region as OIL_LIKE, LOOKALIKE, or UNCERTAIN using the real-data-trained SVM.
    """
    scene = get_scene_repository().get_scene(request.scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene '{request.scene_id}' not found")
        
    raster_path = scene.processed_storage_path or scene.raw_storage_path
    service = LookAlikeService()
    try:
        from app.schemas.slick import Slick
        slick = Slick(
            id=request.slick_id,
            source_scene_id=request.scene_id,
            detected_at=scene.acquisition_time or datetime.utcnow(),
            geometry={"type": "Point", "coordinates": [58.025, 24.474]}
        )
        return await service.assess_candidate(
            slick=slick,
            scene_path=raster_path,
            patch_path=request.patch_path or raster_path
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evidence-fusion", response_model=EvidenceFusionResult)
async def fuse_evidence(request: EvidenceFusionRequest):
    """
    Fuses SAR, ML assessment, and environmental data into an auditable evidence chain.
    """
    scene = get_scene_repository().get_scene(request.scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene '{request.scene_id}' not found")

    env_service = OpenMeteoEnvironmentalService() if settings.ENVIRONMENTAL_PROVIDER == "LIVE_OPEN_METEO" else MockEnvironmentalDataService()
    fusion_service = EvidenceFusionService()
    
    # Resolve or create candidate slick
    from app.schemas.slick import Slick
    lat = (scene.bbox[1] + scene.bbox[3]) / 2 if scene.bbox else 24.474
    lon = (scene.bbox[0] + scene.bbox[2]) / 2 if scene.bbox else 58.025
    slick = Slick(
        id=request.slick_id,
        source_scene_id=request.scene_id,
        detected_at=scene.acquisition_time or datetime.utcnow(),
        geometry={"type": "Point", "coordinates": [lon, lat]},
        centroid=[lon, lat],
        area_sq_km=1.25,
        supporting_metrics={"contrast_ratio": 2.4, "perimeter_km": 4.8}
    )

    try:
        time = scene.acquisition_time
        wind = await env_service.get_wind(lat, lon, time)
        current = await env_service.get_current(lat, lon, time)
        optical = await env_service.get_optical_availability(lat, lon, time)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch environmental context: {str(e)}")

    assessment = request.look_alike_assessment
    if not assessment:
        try:
            la_service = LookAlikeService()
            raster_path = scene.processed_storage_path or scene.raw_storage_path
            assessment = await la_service.assess_candidate(slick, scene_path=raster_path, patch_path=request.patch_path or raster_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate assessment: {str(e)}")

    try:
        return fusion_service.fuse_evidence(
            investigation_id=request.investigation_id,
            scene=scene,
            slick=slick,
            model_assessment=assessment,
            wind=wind,
            current=current,
            optical=optical
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fuse evidence: {str(e)}")
