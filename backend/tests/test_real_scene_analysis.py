import pytest
import numpy as np
import rasterio
from rasterio.transform import from_origin
from unittest.mock import patch, AsyncMock
from app.schemas.satellite import SatelliteScene
from app.services.real_scene_analysis_service import RealSceneAnalysisService
from app.schemas.slick import Slick
from app.schemas.look_alike import LookAlikeAssessment, LookAlikeClass, PatchMetadata

@pytest.fixture
def dummy_scene(tmp_path):
    # Create a small valid test TIFF
    tif_path = tmp_path / "test_scene.tif"
    
    data = np.random.rand(128, 128).astype(np.float32)
    
    transform = from_origin(0.0, 50.0, 0.01, 0.01)
    with rasterio.open(
        tif_path, 'w',
        driver='GTiff',
        height=128,
        width=128,
        count=1,
        dtype=data.dtype,
        crs='EPSG:4326',
        transform=transform
    ) as dst:
        dst.write(data, 1)

    scene = SatelliteScene(
        id="test_scene_123",
        provider="cdse",
        width=128,
        height=128,
        crs="EPSG:4326",
        raw_storage_path="",
        source="CDSE",
        provenance="LIVE",
        collection="sentinel-1-grd",
        acquisition_time="2026-09-01T00:00:00Z",
        bbox=[0.0, 48.0, 1.0, 50.0],
        geometry={"type": "Polygon", "coordinates": [[[0,48], [1,48], [1,50], [0,50], [0,48]]]},
        is_processed=True,
        processed_storage_path=str(tif_path)
    )
    return scene

@pytest.mark.asyncio
async def test_analyze_real_scene_success(dummy_scene):
    service = RealSceneAnalysisService()
    
    # Mock the detection and assessment services
    mock_slick = Slick(
        id="slick_1",
        source_scene_id="test_scene_123",
        detected_at="2026-09-01T00:00:00Z",
        geometry={"type": "Polygon", "coordinates": []},
        area_sq_km=0.1,
        supporting_metrics={"geometry_area": 500} # > 10 pixels
    )
    service.detection_service.detect_slicks = AsyncMock(return_value=[mock_slick])
    
    mock_assessment = LookAlikeAssessment(
        slick_id="slick_1",
        predicted_class=LookAlikeClass.OIL_LIKE,
        raw_score=0.8,
        uncertainty_margin=0.3,
        model_version="v1",
        patch_metadata=PatchMetadata(
            source_scene_id="test_scene_123",
            patch_width=64,
            patch_height=64
        )
    )
    service.look_alike_service.assess_candidate = AsyncMock(return_value=mock_assessment)
    
    result = await service.analyze_real_scene(dummy_scene)
    
    assert result.scene_id == "test_scene_123"
    assert result.provenance == "LIVE"
    assert result.candidate_count == 1
    assert result.candidates[0].candidate_id == "slick_1"
    assert result.candidates[0].classification_status == "SUCCESS"
    assert result.candidates[0].look_alike_assessment.predicted_class == LookAlikeClass.OIL_LIKE
    assert "OUT_OF_DISTRIBUTION" in result.model_metadata.values()

@pytest.mark.asyncio
async def test_analyze_real_scene_too_small(dummy_scene):
    service = RealSceneAnalysisService()
    
    mock_slick = Slick(
        id="slick_small",
        source_scene_id="test_scene_123",
        detected_at="2026-09-01T00:00:00Z",
        geometry={"type": "Polygon", "coordinates": []},
        area_sq_km=0.001,
        supporting_metrics={"geometry_area": 5} # < 10 pixels
    )
    service.detection_service.detect_slicks = AsyncMock(return_value=[mock_slick])
    
    # Assess should NOT be called
    service.look_alike_service.assess_candidate = AsyncMock(side_effect=ValueError("Patch too small"))
    
    result = await service.analyze_real_scene(dummy_scene)
    
    assert result.candidate_count == 1
    assert result.candidates[0].classification_status == "UNAVAILABLE"
    assert "too small" in result.candidates[0].unavailable_reason
    assert result.candidates[0].look_alike_assessment is None

@pytest.mark.asyncio
async def test_invalid_raster(tmp_path):
    # Missing CRS and transform
    tif_path = tmp_path / "invalid_scene.tif"
    data = np.random.rand(10, 10).astype(np.float32)
    with rasterio.open(
        tif_path, 'w',
        driver='GTiff',
        height=10,
        width=10,
        count=1,
        dtype=data.dtype
    ) as dst:
        dst.write(data, 1)

    scene = SatelliteScene(
        id="test_scene_123",
        provider="cdse",
        width=128,
        height=128,
        crs="EPSG:4326",
        raw_storage_path="",
        source="CDSE",
        provenance="LIVE",
        collection="sentinel-1-grd",
        acquisition_time="2026-09-01T00:00:00Z",
        bbox=[0.0, 48.0, 1.0, 50.0],
        geometry={"type": "Polygon", "coordinates": [[[0,48], [1,48], [1,50], [0,50], [0,48]]]},
        is_processed=True,
        processed_storage_path=str(tif_path)
    )
    
    service = RealSceneAnalysisService()
    with pytest.raises(ValueError, match="missing CRS"):
        await service.analyze_real_scene(scene)
