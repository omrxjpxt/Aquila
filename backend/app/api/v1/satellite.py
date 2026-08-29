from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict
from app.schemas.satellite import SatelliteScene, SceneIngestRequest, ProcessingResult
from app.schemas.slick import Slick
from app.services.satellite_service import SatelliteService
from app.services.slick_detection_service import SlickDetectionService

router = APIRouter(prefix="/satellite", tags=["satellite"])

# In-memory mock DB for scenes and candidates
scenes_db: Dict[str, SatelliteScene] = {}
candidates_db: Dict[str, List[Slick]] = {}

def get_satellite_service():
    return SatelliteService()

def get_slick_detection_service():
    return SlickDetectionService()

@router.post("/ingest", response_model=SatelliteScene)
async def ingest_scene(request: SceneIngestRequest, service: SatelliteService = Depends(get_satellite_service)):
    try:
        scene = await service.ingest_local_scene(request)
        scenes_db[scene.id] = scene
        return scene
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scenes/{scene_id}", response_model=SatelliteScene)
async def get_scene(scene_id: str):
    if scene_id not in scenes_db:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scenes_db[scene_id]

@router.post("/scenes/{scene_id}/process", response_model=ProcessingResult)
async def process_scene(scene_id: str, service: SatelliteService = Depends(get_satellite_service)):
    if scene_id not in scenes_db:
        raise HTTPException(status_code=404, detail="Scene not found")
        
    scene = scenes_db[scene_id]
    try:
        result = await service.preprocess_scene(scene)
        scene.is_processed = True
        scene.processed_storage_path = result.processed_path
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scenes/{scene_id}/candidates", response_model=List[Slick])
async def get_candidates(scene_id: str, service: SlickDetectionService = Depends(get_slick_detection_service)):
    if scene_id not in scenes_db:
        raise HTTPException(status_code=404, detail="Scene not found")
        
    if scene_id in candidates_db:
        return candidates_db[scene_id]
        
    scene = scenes_db[scene_id]
    if not scene.is_processed:
        raise HTTPException(status_code=400, detail="Scene must be processed before detection")
        
    try:
        candidates = await service.detect_slicks(scene)
        candidates_db[scene_id] = candidates
        return candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
