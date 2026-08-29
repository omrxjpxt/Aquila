import pytest
from app.services.satellite_service import SatelliteService, SceneIngestRequest
from app.services.slick_detection_service import SlickDetectionService

@pytest.mark.asyncio
async def test_baseline_detection(synthetic_scene_path):
    sat_service = SatelliteService()
    det_service = SlickDetectionService()
    
    # 1. Ingest
    req = SceneIngestRequest(file_path=synthetic_scene_path)
    scene = await sat_service.ingest_local_scene(req)
    
    # 2. Process
    res = await sat_service.preprocess_scene(scene)
    scene.is_processed = True
    scene.processed_storage_path = res.processed_path
    
    # 3. Detect
    slicks = await det_service.detect_slicks(scene)
    
    # Ensure we detected at least one candidate (the dark circle we added)
    assert len(slicks) >= 1
    
    # The anomaly should be classified as BASELINE_CANDIDATE
    for slick in slicks:
        assert slick.classification == "BASELINE_CANDIDATE"
        assert "geometry_area" in slick.supporting_metrics
        assert "offset" in slick.threshold_info
