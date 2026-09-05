"""
Tests for Phase 4B: Look-Alike Classification Service and API.

Tests cover:
  - Valid candidate assessment
  - Class output validation (OIL_LIKE, LOOKALIKE, UNCERTAIN)
  - Malformed/missing input handling
  - Missing model artifact
  - Deterministic inference
  - API response structure
  - Full pipeline integration (ingest → process → detect → assess)
"""

import pytest
import os
import numpy as np
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.look_alike_service import LookAlikeService
from app.schemas.slick import Slick
from datetime import datetime

client = TestClient(app)


@pytest.fixture
def oil_patch_path(tmp_path):
    """Generate a synthetic oil-like patch for testing."""
    img = np.random.normal(40, 5, (400, 400)).astype(np.uint8)  # Dark, smooth
    path = os.path.join(tmp_path, "oil_test.jpg")
    Image.fromarray(img, mode='L').save(path)
    return path


@pytest.fixture
def lookalike_patch_path(tmp_path):
    """Generate a synthetic look-alike patch for testing."""
    img = np.random.normal(120, 30, (400, 400)).astype(np.uint8)  # Bright, textured
    path = os.path.join(tmp_path, "lookalike_test.jpg")
    Image.fromarray(img, mode='L').save(path)
    return path


@pytest.fixture
def dummy_slick():
    """A minimal slick object for testing."""
    return Slick(
        id="test-slick-001",
        source_scene_id="test-scene",
        detected_at=datetime.utcnow(),
        geometry={"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
        area_sq_km=0.5,
        classification="BASELINE_CANDIDATE"
    )


# ── Service-Level Tests ──


@pytest.mark.asyncio
async def test_assess_oil_patch(oil_patch_path, dummy_slick, monkeypatch):
    """Test that a dark smooth patch is classified as OIL_LIKE or UNCERTAIN."""
    monkeypatch.setenv("LOOKALIKE_MODEL_PATH", "data/models/lookalike_svm_v1.joblib")
    service = LookAlikeService()
    assessment = await service.assess_candidate(
        slick=dummy_slick,
        patch_path=oil_patch_path
    )
    assert assessment.predicted_class in ["OIL_LIKE", "UNCERTAIN"]
    assert assessment.model_version == "lookalike_svm_v1"
    assert assessment.slick_id == "test-slick-001"
    assert isinstance(assessment.raw_score, float)


@pytest.mark.asyncio
async def test_assess_lookalike_patch(lookalike_patch_path, dummy_slick, monkeypatch):
    """Test that a bright textured patch is classified as LOOKALIKE or UNCERTAIN."""
    monkeypatch.setenv("LOOKALIKE_MODEL_PATH", "data/models/lookalike_svm_v1.joblib")
    service = LookAlikeService()
    assessment = await service.assess_candidate(
        slick=dummy_slick,
        patch_path=lookalike_patch_path
    )
    assert assessment.predicted_class in ["LOOKALIKE", "UNCERTAIN"]
    assert assessment.model_version == "lookalike_svm_v1"


@pytest.mark.asyncio
async def test_class_output_values(oil_patch_path, dummy_slick):
    """Verify that predicted_class is always one of the valid enum values."""
    service = LookAlikeService()
    assessment = await service.assess_candidate(
        slick=dummy_slick,
        patch_path=oil_patch_path
    )
    valid_classes = {"OIL_LIKE", "LOOKALIKE", "UNCERTAIN"}
    assert assessment.predicted_class in valid_classes


@pytest.mark.asyncio
async def test_no_fake_probabilities(oil_patch_path, dummy_slick):
    """Verify the response contains raw_score, not a percentage or probability."""
    service = LookAlikeService()
    assessment = await service.assess_candidate(
        slick=dummy_slick,
        patch_path=oil_patch_path
    )
    # raw_score from SVM decision_function can be any real number
    # It should NOT be constrained to [0, 1] like a probability
    assert isinstance(assessment.raw_score, float)
    # Ensure model version is present
    assert assessment.model_version != ""
    # Ensure uncertainty_margin is documented
    assert assessment.uncertainty_margin > 0


@pytest.mark.asyncio
async def test_deterministic_inference(oil_patch_path, dummy_slick):
    """Running inference twice on the same input should produce the same result."""
    service = LookAlikeService()
    a1 = await service.assess_candidate(slick=dummy_slick, patch_path=oil_patch_path)
    a2 = await service.assess_candidate(slick=dummy_slick, patch_path=oil_patch_path)
    assert a1.predicted_class == a2.predicted_class
    assert a1.raw_score == a2.raw_score


@pytest.mark.asyncio
async def test_missing_model_artifact(dummy_slick, tmp_path):
    """Service should raise FileNotFoundError when model is missing."""
    service = LookAlikeService()
    service._model_path = os.path.join(str(tmp_path), "nonexistent_model.joblib")
    service._model = None

    patch = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
    patch_path = os.path.join(str(tmp_path), "test.jpg")
    Image.fromarray(patch, mode='L').save(patch_path)

    with pytest.raises(FileNotFoundError):
        await service.assess_candidate(slick=dummy_slick, patch_path=patch_path)


@pytest.mark.asyncio
async def test_empty_patch_raises(dummy_slick, tmp_path):
    """Providing a path to a non-image should raise an error."""
    bad_path = os.path.join(str(tmp_path), "bad.jpg")
    with open(bad_path, 'w') as f:
        f.write("not an image")

    service = LookAlikeService()
    with pytest.raises(Exception):
        await service.assess_candidate(slick=dummy_slick, patch_path=bad_path)


# ── API-Level Tests ──


def test_full_pipeline_integration(synthetic_scene_path):
    """
    Full integration: ingest → process → detect → assess look-alike.
    This tests the entire Phase 4A + 4B pipeline via HTTP.
    """
    # 1. Ingest
    with open(synthetic_scene_path, "rb") as f:
        response = client.post("/api/v1/satellite/ingest", files={"file": ("synthetic_s1_test_scene.tif", f, "image/tiff")})
    assert response.status_code == 200
    scene = response.json()
    scene_id = scene["id"]

    # 2. Process
    response = client.post(f"/api/v1/satellite/scenes/{scene_id}/process")
    assert response.status_code == 200

    # 3. Detect candidates
    response = client.get(f"/api/v1/satellite/scenes/{scene_id}/candidates")
    assert response.status_code == 200
    candidates = response.json()
    assert len(candidates) > 0

    slick_id = candidates[0]["id"]

    # 4. Assess look-alike
    response = client.post("/api/v1/analysis/look-alike", json={
        "slick_id": slick_id,
        "scene_id": scene_id
    })
    assert response.status_code == 200
    assessment = response.json()

    # Validate response structure
    assert "predicted_class" in assessment
    assert assessment["predicted_class"] in ["OIL_LIKE", "LOOKALIKE", "UNCERTAIN"]
    assert "raw_score" in assessment
    assert "model_version" in assessment
    assert assessment["model_version"] == "lookalike_svm_real_v1"
    assert "patch_metadata" in assessment
    assert "uncertainty_margin" in assessment


def test_api_missing_scene():
    """Test 404 when scene doesn't exist."""
    response = client.post("/api/v1/analysis/look-alike", json={
        "slick_id": "nonexistent",
        "scene_id": "nonexistent"
    })
    assert response.status_code == 404


def test_api_missing_slick(synthetic_scene_path):
    """Test 404 when slick doesn't exist in a valid scene."""
    # Ingest
    with open(synthetic_scene_path, "rb") as f:
        response = client.post("/api/v1/satellite/ingest", files={"file": ("synthetic_s1_test_scene.tif", f, "image/tiff")})
    scene_id = response.json()["id"]

    # Process
    client.post(f"/api/v1/satellite/scenes/{scene_id}/process")

    # Detect (to populate candidates_db)
    client.get(f"/api/v1/satellite/scenes/{scene_id}/candidates")

    # Assess with wrong slick ID
    response = client.post("/api/v1/analysis/look-alike", json={
        "slick_id": "nonexistent-slick",
        "scene_id": scene_id
    })
    assert response.status_code == 404
