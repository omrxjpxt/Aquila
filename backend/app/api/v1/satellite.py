from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query, Response
import os
import shutil
import uuid
import io
import numpy as np
from pathlib import Path
from typing import List
from datetime import datetime

from app.schemas.satellite import SatelliteScene, SceneIngestRequest, ProcessingResult, SatelliteSearchResult, SatelliteRetrievalRequest
from app.schemas.slick import Slick
from app.services.satellite_service import SatelliteService
from app.services.slick_detection_service import SlickDetectionService
from app.services.cdse_service import CDSEService
from app.services.repositories.factory import get_scene_repository

router = APIRouter(prefix="/satellite", tags=["satellite"])


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
        b = request.bbox
        if len(b) != 4 or b[0] >= b[2] or b[1] >= b[3]:
            raise ValueError("Invalid bounding box dimensions")
            
        file_path = await cdse_service.retrieve_raster(
            bbox=b, scene=request.scene, width=request.width, height=request.height
        )
        
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
        get_scene_repository().save_scene(scene)
        return scene
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest", response_model=SatelliteScene)
async def ingest_scene(
    file: UploadFile = File(...),
    service: SatelliteService = Depends(get_satellite_service)
):
    try:
        upload_dir = Path("data/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        file_ext = Path(file.filename).suffix if file.filename else ".tif"
        temp_file_path = upload_dir / f"upload_{uuid.uuid4()}{file_ext}"

        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        request = SceneIngestRequest(file_path=str(temp_file_path), provider="UPLOAD")
        scene = await service.ingest_local_scene(request)
        get_scene_repository().save_scene(scene)
        return scene
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ingest/sample", response_model=SatelliteScene)
async def ingest_sample_scene(service: SatelliteService = Depends(get_satellite_service)):
    try:
        sample_path = "data/sample/real_s1_cropped.tif"
        if not os.path.exists(sample_path):
            raise HTTPException(status_code=404, detail="Sample scene not found on server")

        request = SceneIngestRequest(file_path=sample_path, provider="SENTINEL_1")
        scene = await service.ingest_local_scene(request)
        get_scene_repository().save_scene(scene)
        return scene
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenes", response_model=List[SatelliteScene])
async def list_scenes():
    return get_scene_repository().list_scenes(limit=50)


@router.get("/scenes/{scene_id}", response_model=SatelliteScene)
async def get_scene(scene_id: str):
    scene = get_scene_repository().get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    return scene


@router.post("/scenes/{scene_id}/process", response_model=ProcessingResult)
async def process_scene(scene_id: str, service: SatelliteService = Depends(get_satellite_service)):
    scene = get_scene_repository().get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")

    try:
        result = await service.preprocess_scene(scene)
        scene.is_processed = True
        scene.processed_storage_path = result.processed_path
        get_scene_repository().save_scene(scene)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenes/{scene_id}/candidates", response_model=List[Slick])
async def get_candidates(scene_id: str, service: SlickDetectionService = Depends(get_slick_detection_service)):
    scene = get_scene_repository().get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    if not scene.is_processed:
        raise HTTPException(status_code=400, detail="Scene must be processed before detection")

    try:
        candidates = await service.detect_slicks(scene)
        return candidates
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scenes/{scene_id}/preview")
async def get_scene_preview(scene_id: str):
    scene = get_scene_repository().get_scene(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    raster_path = scene.processed_storage_path if scene.is_processed else scene.raw_storage_path
    if not raster_path or not os.path.exists(raster_path):
        raise HTTPException(status_code=404, detail="Raster file not available")

    try:
        import rasterio
        import matplotlib
        matplotlib.use('Agg')
        from matplotlib import pyplot as plt
        import matplotlib.patches as patches

        with rasterio.open(raster_path) as src:
            # Downsample for preview if very large
            if src.width > 2048 or src.height > 2048:
                scale = min(2048/src.width, 2048/src.height)
                new_width = int(src.width * scale)
                new_height = int(src.height * scale)
                data = src.read(1, out_shape=(new_height, new_width))
            else:
                data = src.read(1)
        
        # Replace NaN/nodata with 0
        data = np.nan_to_num(data, nan=0.0)

        # Apply a display stretch (2nd to 98th percentile) for visualization
        p2, p98 = np.percentile(data[data > 0], (2, 98)) if np.any(data > 0) else (0, 1)
        data_clipped = np.clip(data, p2, p98)
        data_normalized = (data_clipped - p2) / (p98 - p2 + 1e-9)

        # Plot
        fig, ax = plt.subplots(figsize=(8, 8), dpi=100)
        ax.imshow(data_normalized, cmap='gray', vmin=0, vmax=1)
        ax.axis('off')

        # Add watermark
        ax.text(0.5, 0.02, "Display stretch applied for visualization — scientific raster unchanged.", 
                color='white', fontsize=10, ha='center', va='bottom', transform=ax.transAxes,
                bbox=dict(facecolor='black', alpha=0.5, edgecolor='none', pad=2))

        buf = io.BytesIO()
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0, facecolor='black')
        plt.close(fig)
        
        buf.seek(0)
        return Response(content=buf.read(), media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate preview: {e}")
