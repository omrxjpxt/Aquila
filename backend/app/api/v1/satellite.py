from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
import os
import shutil
import uuid
from pathlib import Path
from typing import List, Dict
from app.schemas.satellite import SatelliteScene, SceneIngestRequest, ProcessingResult, SatelliteSearchResult, SatelliteRetrievalRequest
from app.schemas.slick import Slick
from app.services.satellite_service import SatelliteService
from app.services.slick_detection_service import SlickDetectionService
from app.services.cdse_service import CDSEService
from fastapi import Query
from datetime import datetime

router = APIRouter(prefix="/satellite", tags=["satellite"])

# In-memory mock DB for scenes and candidates
scenes_db: Dict[str, SatelliteScene] = {}
candidates_db: Dict[str, List[Slick]] = {}


def get_satellite_service():
    return SatelliteService()


def get_slick_detection_service():
    return SlickDetectionService()


def get_cdse_service():
    return CDSEService()


@router.get("/search", response_model=List[SatelliteSearchResult])
async def search_scenes(
    bbox: str = Query(..., description="Bounding box in format min_lon,min_lat,max_lon,max_lat"),
    start_datetime: datetime = Query(...),
    end_datetime: datetime = Query(...),
    limit: int = Query(10, ge=1, le=100),
    service: CDSEService = Depends(get_cdse_service)
):
    try:
        bbox_parts = [float(p.strip()) for p in bbox.split(",")]
        if len(bbox_parts) != 4:
            raise ValueError("Bounding box must have 4 coordinates")
            
        return await service.search_scenes(
            bbox=(bbox_parts[0], bbox_parts[1], bbox_parts[2], bbox_parts[3]),
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            limit=limit
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception:
        raise HTTPException(status_code=500, detail="An error occurred during the search operation.")


@router.post("/retrieve", response_model=SatelliteScene)
async def retrieve_scene(
    request: SatelliteRetrievalRequest,
    cdse_service: CDSEService = Depends(get_cdse_service),
    sat_service: SatelliteService = Depends(get_satellite_service)
):
    try:
        # Validate bbox
        b = request.bbox
        if len(b) != 4:
            raise ValueError("Bounding box must have 4 coordinates")
        if b[0] >= b[2] or b[1] >= b[3]:
            raise ValueError("Invalid bounding box dimensions")
            
        # Retrieve raster
        file_path = await cdse_service.retrieve_raster(
            bbox=b,
            scene=request.scene,
            width=request.width,
            height=request.height
        )
        
        # Ingest into existing pipeline
        ingest_req = SceneIngestRequest(
            file_path=file_path,
            provider="CDSE_PROCESS_API",
            scene_id=request.scene.id,
            acquisition_time=request.scene.acquisition_time,
            source="CDSE",
            provenance="LIVE",
            retrieval_api="Sentinel Hub Process v1",
            original_stac_scene_id=request.scene.id,
            collection=request.scene.collection,
            polarization=request.scene.polarization,
            backscatter_coefficient="SIGMA0_ELLIPSOID",
            orthorectified=True,
            retrieval_timestamp=datetime.utcnow()
        )
        
        scene = await sat_service.ingest_local_scene(ingest_req)
        scenes_db[scene.id] = scene
        return scene
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except PermissionError as pe:
        raise HTTPException(status_code=401, detail=str(pe))
    except RuntimeError as re:
        raise HTTPException(status_code=502, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest", response_model=SatelliteScene)
async def ingest_scene(
    file: UploadFile = File(...),
    service: SatelliteService = Depends(get_satellite_service)
):
    try:
        # Save uploaded file to a temporary location
        upload_dir = Path("data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_ext = Path(file.filename).suffix if file.filename else ".tif"
        temp_file_path = upload_dir / f"upload_{uuid.uuid4()}{file_ext}"

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        request = SceneIngestRequest(file_path=str(temp_file_path), provider="UPLOAD")
        scene = await service.ingest_local_scene(request)
        scenes_db[scene.id] = scene
        return scene
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest/sample", response_model=SatelliteScene)
async def ingest_sample_scene(service: SatelliteService = Depends(get_satellite_service)):
    """Development only: Ingests the pre-existing sample GeoTIFF."""
    try:
        sample_path = "data/sample/real_s1_cropped.tif"
        if not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail="Sample scene not found on server")

        request = SceneIngestRequest(file_path=sample_path, provider="SENTINEL_1")
        scene = await service.ingest_local_scene(request)
        scenes_db[scene.id] = scene
        return scene
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
