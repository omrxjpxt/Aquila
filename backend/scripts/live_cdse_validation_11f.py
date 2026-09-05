import asyncio
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.cdse_service import CDSEService
from app.services.satellite_service import SatelliteService
from app.services.look_alike_service import LookAlikeService
from app.services.slick_detection_service import SlickDetectionService
from app.schemas.satellite import SatelliteSearchResult, SceneIngestRequest

async def run_live_validation():
    print("--- Phase 11F Live CDSE Sentinel-1 Validation ---")
    
    # Check credentials
    if not os.environ.get("CDSE_CLIENT_SECRET"):
        print("ERROR: CDSE_CLIENT_SECRET not set.")
        return

    cdse = CDSEService()
    satellite_service = SatelliteService()
    detection_service = SlickDetectionService()

    # Known scene over Corsica region (from Phase 11D)
    bbox = [9.0, 42.0, 9.5, 42.5]
    print(f"\n1. Searching for recent Sentinel-1 GRD scene near Corsica {bbox}...")
    
    results = await cdse.search_scenes(
        bbox=tuple(bbox),
        start_datetime=datetime(2024, 5, 1, tzinfo=timezone.utc),
        end_datetime=datetime(2024, 5, 31, 23, 59, 59, tzinfo=timezone.utc),
        limit=1
    )
    
    if not results:
        print("No scenes found. Aborting.")
        return
        
    scene_result = results[0]
    print(f"   Selected scene: {scene_result.id} ({scene_result.acquisition_time})")

    # Small bounding box inside the scene
    patch_bbox = [9.2, 42.2, 9.25, 42.25]
    print(f"\n2. Retrieving small test raster for {patch_bbox}...")
    
    raster_path = await cdse.retrieve_raster(
        bbox=patch_bbox,
        scene=scene_result,
        width=512,
        height=512
    )
    
    print(f"   Saved Process API raster: {raster_path}")
    
    print("\n3. Ingesting through Satellite Pipeline...")
    request = SceneIngestRequest(
        file_path=str(Path(raster_path).absolute()),
        provider="cdse",
        product_type="GRD"
    )
    scene = await satellite_service.ingest_local_scene(request)
    print(f"   Scene ingested (ID: {scene.id})")
    
    print("\n4. Preprocessing...")
    preprocessed = await satellite_service.preprocess_scene(scene)
    print(f"   Processed path: {preprocessed.processed_path}")
    scene.is_processed = True
    scene.processed_storage_path = preprocessed.processed_path
    
    print("\n5. Running Baseline Candidate Detection...")
    candidates = await detection_service.detect_slicks(scene)
    
    if not candidates:
        print("   No dark anomalies detected in this small test patch. Try adjusting bbox if a target is needed.")
        return
        
    candidate = candidates[0]
    print(f"   Detected candidate {candidate.id}, Area: {candidate.area_sq_km:.3f} km2")
    
    print("\n6. Running Real-Trained Model (Default)...")
    os.environ["LOOKALIKE_MODEL_PATH"] = "data/models/lookalike_svm_real_v1.joblib"
    service_real = LookAlikeService()
    
    assessment_real = await service_real.assess_candidate(candidate, scene_path=scene.processed_storage_path)
    
    print(f"   Model Name:     {assessment_real.model_name}")
    print(f"   Model Version:  {assessment_real.model_version}")
    print(f"   Prediction:     {assessment_real.predicted_class}")
    print(f"   Raw Score:      {assessment_real.raw_score:.4f}")
    
    print("\n7. Running Synthetic Model (Fallback)...")
    os.environ["LOOKALIKE_MODEL_PATH"] = "data/models/lookalike_svm_v1.joblib"
    service_synth = LookAlikeService()
    
    assessment_synth = await service_synth.assess_candidate(candidate, scene_path=scene.processed_storage_path)
    
    print(f"   Model Name:     {assessment_synth.model_name}")
    print(f"   Model Version:  {assessment_synth.model_version}")
    print(f"   Prediction:     {assessment_synth.predicted_class}")
    print(f"   Raw Score:      {assessment_synth.raw_score:.4f}")
    
    print("\n==============================")
    print("LIVE VALIDATION COMPLETE")
    print("==============================")

if __name__ == "__main__":
    asyncio.run(run_live_validation())
