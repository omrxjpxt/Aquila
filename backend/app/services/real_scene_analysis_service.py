import numpy as np
import rasterio
from typing import Optional

from app.schemas.satellite import SatelliteScene
from app.schemas.analysis import RealSceneAnalysisResult, CandidateAnalysis
from app.services.satellite_service import SatelliteService
from app.services.slick_detection_service import SlickDetectionService
from app.services.look_alike_service import LookAlikeService

class RealSceneAnalysisService:
    def __init__(self):
        self.satellite_service = SatelliteService()
        self.detection_service = SlickDetectionService()
        self.look_alike_service = LookAlikeService()
        
    async def analyze_real_scene(self, scene: SatelliteScene) -> RealSceneAnalysisResult:
        if not scene.raw_storage_path and not scene.processed_storage_path:
            raise ValueError("Scene has no raw or processed storage path.")
            
        # 1. Preprocessing (reuse existing)
        if not scene.is_processed:
            result = await self.satellite_service.preprocess_scene(scene)
            scene.is_processed = True
            scene.processed_storage_path = result.processed_path
            
        # 2. Extract raster stats
        with rasterio.open(scene.processed_storage_path) as src:
            data = src.read(1)
            nodata = src.nodata
            transform = src.transform
            crs = str(src.crs) if src.crs else "Unknown"
            
            if not transform:
                raise ValueError("Raster missing transform.")
            if crs == "Unknown":
                raise ValueError("Raster missing CRS.")
                
            width = src.width
            height = src.height
            total_pixels = width * height
            
            if nodata is not None:
                valid_mask = data != nodata
            else:
                valid_mask = ~np.isnan(data)
                
            valid_pixels = int(np.sum(valid_mask))
            if valid_pixels == 0:
                raise ValueError("Raster contains no valid pixels.")
                
            valid_data = data[valid_mask]
            pixel_min = float(np.min(valid_data))
            pixel_max = float(np.max(valid_data))
            pixel_mean = float(np.mean(valid_data))
            pixel_median = float(np.median(valid_data))
            
        # 3. Detect candidates (baseline dark anomaly detector)
        candidates = await self.detection_service.detect_slicks(scene)
        
        # 4. Assess candidates
        candidate_analyses = []
        for slick in candidates:
            area = slick.supporting_metrics.get("geometry_area", 0)
            status = "SUCCESS"
            unavailable_reason = None
            assessment = None
            
            try:
                assessment = await self.look_alike_service.assess_candidate(
                    slick=slick,
                    scene_path=scene.processed_storage_path
                )
            except ValueError as e:
                status = "UNAVAILABLE"
                unavailable_reason = f"Classification not possible: {str(e)}"
            except Exception as e:
                status = "UNAVAILABLE"
                unavailable_reason = f"Classification failed: {str(e)}"
                    
            candidate_analyses.append(CandidateAnalysis(
                candidate_id=slick.id,
                geometry=slick.geometry,
                area=area,
                classification_status=status,
                unavailable_reason=unavailable_reason,
                look_alike_assessment=assessment
            ))
            
        return RealSceneAnalysisResult(
            scene_id=scene.id,
            analysis_mode="REAL_SCENE_BASELINE",
            provenance=scene.provenance,
            source=scene.source,
            raster_width=width,
            raster_height=height,
            crs=crs,
            total_pixels=total_pixels,
            valid_pixels=valid_pixels,
            valid_pixel_percentage=(valid_pixels / total_pixels) * 100 if total_pixels > 0 else 0.0,
            pixel_min=pixel_min,
            pixel_max=pixel_max,
            pixel_mean=pixel_mean,
            pixel_median=pixel_median,
            candidate_count=len(candidates),
            candidates=candidate_analyses
        )
