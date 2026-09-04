import asyncio
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.services.cdse_service import CDSEService
from app.services.satellite_service import SatelliteService
from app.services.real_scene_analysis_service import RealSceneAnalysisService
from app.schemas.satellite import SceneIngestRequest

async def main():
    print("========================================")
    print("AQUILA REAL SCENE ANALYSIS")
    print("========================================")
    
    cdse = CDSEService()
    sat_service = SatelliteService()
    analysis_service = RealSceneAnalysisService()
    
    bbox = (4.4, 52.3, 4.45, 52.35)
    start_date = datetime(2026, 8, 20, tzinfo=timezone.utc)
    end_date = datetime(2026, 9, 5, tzinfo=timezone.utc)
    
    print("1. Searching for scene...")
    results = await cdse.search_scenes(bbox, start_date, end_date, limit=1)
    if not results:
        print("No scenes found in CDSE catalog.")
        return
        
    scene_result = results[0]
    print(f"   Found Scene: {scene_result.id}")
    
    print("2. Retrieving raster (256x256)...")
    file_path = await cdse.retrieve_raster(bbox, scene_result, width=256, height=256)
    
    print("3. Ingesting to local registry...")
    ingest_req = SceneIngestRequest(
        id=scene_result.id,
        source=scene_result.source,
        provenance=scene_result.provenance,
        collection=scene_result.collection,
        acquisition_time=scene_result.acquisition_time,
        bbox=scene_result.bbox,
        geometry=scene_result.geometry,
        file_path=file_path,
        polarization=scene_result.polarization
    )
    scene = await sat_service.ingest_local_scene(ingest_req)
    
    print("4. Running Real Scene Analysis Pipeline...")
    report = await analysis_service.analyze_real_scene(scene)
    
    print("\n========================================")
    print("SCENE METADATA")
    print(f"Scene: {report.scene_id}")
    print(f"Source: {report.source}")
    print(f"Provenance: {report.provenance}")
    print(f"Analysis mode: {report.analysis_mode}")
    print("\nRASTER STATISTICS")
    print(f"Dimensions: {report.raster_width} x {report.raster_height}")
    print(f"CRS: {report.crs}")
    print(f"Total pixels: {report.total_pixels}")
    print(f"Valid pixels: {report.valid_pixels}")
    print(f"Valid %: {report.valid_pixel_percentage:.2f}%")
    print(f"Min: {report.pixel_min:.4f}")
    print(f"Max: {report.pixel_max:.4f}")
    print(f"Mean: {report.pixel_mean:.4f}")
    print(f"Median: {report.pixel_median:.4f}")
    
    print("\nDETECTION RESULTS")
    print(f"Candidate count: {report.candidate_count}")
    
    if report.candidate_count > 0:
        areas = [c.area for c in report.candidates]
        print(f"Candidate area min: {min(areas):.2f}")
        print(f"Candidate area max: {max(areas):.2f}")
        print(f"Candidate area median: {sorted(areas)[len(areas)//2]:.2f}")
    
    for i, c in enumerate(report.candidates):
        print(f"\n--- Candidate {i+1} ---")
        print(f"ID: {c.candidate_id}")
        print(f"Area: {c.area:.2f}")
        print(f"Classification status: {c.classification_status}")
        if c.classification_status == "SUCCESS":
            la = c.look_alike_assessment
            print(f"Prediction: {la.predicted_class.value}")
            print(f"Raw score: {la.raw_score:.4f}")
        else:
            print(f"Unavailable reason: {c.unavailable_reason}")
            
    print("\nMODEL METADATA")
    for k, v in report.model_metadata.items():
        print(f"{k}: {v}")
        
    print("\nLIMITATIONS")
    for i, l in enumerate(report.limitations):
        print(f"{i+1}. {l}")

if __name__ == "__main__":
    asyncio.run(main())
