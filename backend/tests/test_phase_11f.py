import pytest
import os
import json
import numpy as np
from PIL import Image
from pathlib import Path
from pydantic import ValidationError

from app.schemas.slick import Slick
from app.services.look_alike_service import LookAlikeService
from app.schemas.look_alike import LookAlikeAssessment

# Paths
MODELS_DIR = Path(__file__).parent.parent / "data" / "models"
REAL_MODEL_PATH = MODELS_DIR / "lookalike_svm_real_v1.joblib"
SYNTHETIC_MODEL_PATH = MODELS_DIR / "lookalike_svm_v1.joblib"

TEST_IMAGE_PATH = Path(__file__).parent.parent / "data" / "validation" / "S1B_IW_GRDH_1SDV_20190514T054743_20190514T054808_016233_01E8C1_75F0.SAFE_89.jpg"

@pytest.fixture
def test_slick():
    from datetime import datetime
    return Slick(
        id="test-slick-1",
        source_scene_id="test-scene-1",
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        bbox=[0, 0, 1, 1],
        area_sq_km=5.0,
        area_km2=5.0,
        centroid=[0.5, 0.5],
        detected_at=datetime.utcnow()
    )

@pytest.fixture
def mock_patch(tmp_path):
    img_path = tmp_path / "mock_patch.jpg"
    if TEST_IMAGE_PATH.exists():
        # Use actual validation image if available
        return str(TEST_IMAGE_PATH)
    else:
        # Fallback to random patch
        arr = np.random.randint(0, 256, (128, 128), dtype=np.uint8)
        img = Image.fromarray(arr, mode='L')
        img.save(img_path)
        return str(img_path)

@pytest.mark.asyncio
async def test_real_model_default_loading(test_slick, mock_patch):
    """Verify that by default, or with the real model path, the correct metadata is injected."""
    os.environ["LOOKALIKE_MODEL_PATH"] = str(REAL_MODEL_PATH)
    service = LookAlikeService()
    
    assert service._is_real_model is True
    
    assessment = await service.assess_candidate(test_slick, patch_path=mock_patch)
    
    assert assessment.model_version == "lookalike_svm_real_v1"
    assert assessment.training_domain == "REAL_SENTINEL_1_DERIVED"
    assert assessment.evaluation_status == "REAL_DATA_TRAINED"
    assert assessment.artifact_identifier == str(REAL_MODEL_PATH)
    assert isinstance(assessment.raw_score, float)

@pytest.mark.asyncio
async def test_synthetic_model_fallback(test_slick, mock_patch):
    """Verify that configuring the synthetic path falls back correctly."""
    os.environ["LOOKALIKE_MODEL_PATH"] = str(SYNTHETIC_MODEL_PATH)
    service = LookAlikeService()
    
    assert service._is_real_model is False
    
    assessment = await service.assess_candidate(test_slick, patch_path=mock_patch)
    
    assert assessment.model_version == "lookalike_svm_v1"
    assert assessment.training_domain == "SYNTHETIC"
    assert assessment.evaluation_status == "SYNTHETIC_TRAINED"
    assert assessment.artifact_identifier == str(SYNTHETIC_MODEL_PATH)

@pytest.mark.asyncio
async def test_missing_artifact_fails_clearly(test_slick, mock_patch):
    """Verify that a missing artifact path raises FileNotFoundError rather than silently falling back."""
    os.environ["LOOKALIKE_MODEL_PATH"] = "data/models/does_not_exist.joblib"
    service = LookAlikeService()
    
    with pytest.raises(FileNotFoundError, match="Model artifact not found"):
        await service.assess_candidate(test_slick, patch_path=mock_patch)

@pytest.mark.asyncio
async def test_deterministic_inference_comparison(test_slick):
    """
    Check if the models output deterministic values for a single patch.
    This acts as a regression test to ensure HOG extraction remains compatible.
    """
    if not TEST_IMAGE_PATH.exists():
        pytest.skip("Test image not available")
        
    os.environ["LOOKALIKE_MODEL_PATH"] = str(SYNTHETIC_MODEL_PATH)
    service_synth = LookAlikeService()
    synth_assessment = await service_synth.assess_candidate(test_slick, patch_path=str(TEST_IMAGE_PATH))
    
    os.environ["LOOKALIKE_MODEL_PATH"] = str(REAL_MODEL_PATH)
    service_real = LookAlikeService()
    real_assessment = await service_real.assess_candidate(test_slick, patch_path=str(TEST_IMAGE_PATH))
    
    assert synth_assessment.raw_score != real_assessment.raw_score, "Models output identical scores, unlikely for different weights"
    # Ensure they both succeeded without feature dimension mismatch errors.
