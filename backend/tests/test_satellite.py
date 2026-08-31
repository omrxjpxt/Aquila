import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_ingest_process_detect(synthetic_scene_path):
    # 1. Ingest
    with open(synthetic_scene_path, "rb") as f:
        response = client.post("/api/v1/satellite/ingest", files={"file": ("synthetic_s1_test_scene.tif", f, "image/tiff")})
    assert response.status_code == 200
    scene = response.json()
    scene_id = scene["id"]
    assert scene["width"] == 512
    assert scene["polarization"] == "VV"
    
    # 2. Process
    response = client.post(f"/api/v1/satellite/scenes/{scene_id}/process")
    assert response.status_code == 200
    result = response.json()
    assert result["processed_path"].endswith("_processed.tif")
    
    # 3. Detect
    response = client.get(f"/api/v1/satellite/scenes/{scene_id}/candidates")
    assert response.status_code == 200
    candidates = response.json()
    
    assert len(candidates) > 0
    candidate = candidates[0]
    assert candidate["classification"] == "BASELINE_CANDIDATE"
    assert "threshold_info" in candidate
    assert candidate["supporting_metrics"]["geometry_area"] > 0
