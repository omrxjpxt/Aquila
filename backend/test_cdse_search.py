import pytest
import os
import asyncio
import sys
from datetime import datetime, timedelta
from app.services.cdse_service import CDSEService

@pytest.mark.asyncio
async def test_live_search():
    print("--- CDSE Sentinel-1 STAC Search Live Test ---")
    service = CDSEService()
    
    # Example bbox over English Channel / North Sea
    # Roughly: min_lon, min_lat, max_lon, max_lat
    bbox = (1.0, 50.5, 2.0, 51.5)
    
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7) # Look back 7 days
    
    print(f"BBox: {bbox}")
    print(f"Date range: {start_date.isoformat()} to {end_date.isoformat()}")
    
    try:
        results = await service.search_scenes(bbox, start_date, end_date, limit=3)
        print(f"\nFound {len(results)} scenes.")
        for idx, scene in enumerate(results):
            print(f"\nScene {idx + 1}:")
            print(f"  ID: {scene.id}")
            print(f"  Acquisition: {scene.acquisition_time}")
            print(f"  Platform: {scene.platform}")
            print(f"  Polarization: {scene.polarization}")
            print(f"  Orbit: {scene.orbit_direction}")
            print(f"  Mode: {scene.instrument_mode}")
            print(f"  Provenance: {scene.source} / {scene.provenance}")
            print(f"  Thumbnail: {scene.thumbnail_url}")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Search failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(test_live_search())
