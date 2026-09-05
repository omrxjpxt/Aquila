import asyncio
import pytest
import os
import sys
from datetime import datetime, timezone
import rasterio

# Add the project root to sys.path so we can import from app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from app.services.cdse_service import CDSEService
from app.schemas.satellite import SatelliteSearchResult

@pytest.mark.asyncio
async def test_live_retrieval():
    service = CDSEService()
    
    # A tiny AOI somewhere over water/land boundary (e.g. Netherlands coast)
    bbox = (4.4, 52.3, 4.45, 52.35)
    start_date = datetime(2026, 8, 20, tzinfo=timezone.utc)
    end_date = datetime(2026, 9, 5, tzinfo=timezone.utc)
    
    print("--- CDSE Sentinel-1 Process API Live Test ---")
    print(f"BBox: {bbox}")
    
    try:
        # First find a scene
        results = await service.search_scenes(bbox, start_date, end_date, limit=1)
        if not results:
            print("No scenes found in this bbox/time. Please broaden the search.")
            sys.exit(0)
            
        scene = results[0]
        print(f"Found Scene ID: {scene.id}")
        print(f"Acquisition: {scene.acquisition_time}")
        print(f"Polarization: {scene.polarization}")
        
        # Now retrieve
        print("Retrieving raster (128x128)...")
        file_path = await service.retrieve_raster(bbox, scene, width=128, height=128)
        print(f"Raster saved to: {file_path}")
        
        print("\n--- Rasterio Metadata ---")
        with rasterio.open(file_path) as src:
            print(f"CRS: {src.crs}")
            print(f"Width: {src.width}, Height: {src.height}")
            print(f"Dtype: {src.dtypes[0]}")
            print(f"NoData: {src.nodata}")
            print(f"Bounds: {src.bounds}")
            
            data = src.read(1)
            import numpy as np
            
            # Since we set NoData to NaN in evalscript, we should check for NaNs
            mask = np.isnan(data) if src.nodata is None or np.isnan(src.nodata) else data == src.nodata
            
            valid_pixels = data[~mask]
            
            if len(valid_pixels) > 0:
                print(f"Min valid value: {np.min(valid_pixels)}")
                print(f"Max valid value: {np.max(valid_pixels)}")
                print(f"Sample valid pixels: {valid_pixels[:5]}")
            else:
                print("Warning: All pixels are NoData/NaN.")
                
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Retrieval failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_live_retrieval())
