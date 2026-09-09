from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.schemas.analysis import RealSceneAnalysisResult
from app.services.real_scene_analysis_service import RealSceneAnalysisService
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
