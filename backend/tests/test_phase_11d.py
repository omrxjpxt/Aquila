import pytest
import json
import os
import numpy as np
from pathlib import Path
from PIL import Image

from app.services.look_alike_service import LookAlikeService
from app.schemas.slick import Slick

@pytest.fixture
def mock_manifest(tmp_path):
    manifest_path = tmp_path / "phase_11d_manifest.json"
    
    # Create dummy images
    img1_path = tmp_path / "oil.jpg"
    img2_path = tmp_path / "no_oil.jpg"
    
    # 256x256 grayscale
    Image.fromarray(np.zeros((256, 256), dtype=np.uint8)).save(img1_path)
    Image.fromarray(np.full((256, 256), 255, dtype=np.uint8)).save(img2_path)
    
    manifest_data = [
        {
            "sample_id": "oil.jpg",
            "source_dataset": "PANGAEA.980773 DARTIS_2019",
            "label": "OIL",
            "source_image": str(img1_path),
            "scene_id": "S1A_...",
            "track_a": True,
            "track_b": True
        },
        {
            "sample_id": "no_oil.jpg",
            "source_dataset": "PANGAEA.980773 DARTIS_2019",
            "label": "LOOK_ALIKE",
            "source_image": str(img2_path),
            "scene_id": "S1B_...",
            "track_a": True,
            "track_b": False
        }
    ]
    with open(manifest_path, 'w') as f:
        json.dump(manifest_data, f)
        
    return manifest_path, manifest_data

def test_manifest_loading_and_labels(mock_manifest):
    manifest_path, manifest_data = mock_manifest
    with open(manifest_path, 'r') as f:
        data = json.load(f)
        
    assert len(data) == 2
    assert data[0]["label"] == "OIL"
    assert data[1]["label"] == "LOOK_ALIKE"
    assert data[0]["track_a"] is True
    assert data[1]["track_b"] is False

@pytest.mark.asyncio
async def test_look_alike_service_8bit_adaptation(mock_manifest):
    _, manifest_data = mock_manifest
    
    service = LookAlikeService()
    
    # Test adaptation through assess_candidate
    img_path = manifest_data[0]["source_image"]
    
    dummy_slick = Slick(
        id="dummy",
        source_scene_id="dummy",
        detected_at="2026-09-01T00:00:00Z",
        geometry={},
        area_sq_km=0.0
    )
    
    assessment = await service.assess_candidate(slick=dummy_slick, patch_path=img_path)
    
    assert assessment is not None
    assert assessment.predicted_class is not None
    assert isinstance(assessment.raw_score, float)
    
    with pytest.raises(FileNotFoundError):
        Image.open("non_existent_image.jpg")
