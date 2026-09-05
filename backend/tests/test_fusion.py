import pytest
from datetime import datetime, timezone, timedelta
from app.schemas.environment import WindObservation, CurrentObservation, OpticalAvailability, OpticalAvailabilityStatus
from app.schemas.look_alike import LookAlikeAssessment
from app.schemas.satellite import SatelliteScene
from app.schemas.slick import Slick
from app.services.evidence_fusion_service import EvidenceFusionService
from app.schemas.evidence_fusion import EvidenceStatus, EvidenceCategory

@pytest.fixture
def dummy_scene():
    return SatelliteScene(
        id="scene_1",
        provider="TEST",
        product_type="TEST",
        acquisition_mode="TEST",
        polarization="VV",
        acquisition_time=datetime.now(timezone.utc),
        bbox=[0.0, 0.0, 1.0, 1.0],
        width=1000,
        height=1000,
        crs="EPSG:4326",
        raw_storage_path="",
        is_processed=True
    )

@pytest.fixture
def dummy_slick():
    return Slick(
        id="slick_1",
        source_scene_id="scene_1",
        geometry={"type": "Polygon", "coordinates": [[[0,0], [0,1], [1,1], [1,0], [0,0]]]},
        area_sq_km=2.0,
        centroid=[0.5, 0.5],
        detected_at=datetime.now(timezone.utc),
        supporting_metrics={"contrast_ratio": 1.5, "perimeter_km": 1.0}
    )

@pytest.fixture
def dummy_assessment():
    return LookAlikeAssessment(
        slick_id="slick_1",
        predicted_class="OIL_LIKE",
        raw_score=1.5,
        uncertainty_margin=0.1,
        model_version="v1",
        model_type="TEST",
        patch_metadata={"source_scene_id": "scene_1", "patch_width": 256, "patch_height": 256, "extraction_method": "TEST"},
        assessed_at=datetime.now(timezone.utc).isoformat()
    )

def test_fusion_wind_bands(dummy_scene, dummy_slick, dummy_assessment):
    service = EvidenceFusionService()
    
    # Base dependencies
    current = CurrentObservation(source="MOCK", provider="TEST", timestamp=dummy_scene.acquisition_time, speed_m_s=0.5, direction_deg=90)
    optical = OpticalAvailability(source="MOCK", provider="TEST", timestamp=dummy_scene.acquisition_time, status=OpticalAvailabilityStatus.AVAILABLE)

    # Test < 2 m/s
    wind = WindObservation(source="MOCK", provider="TEST", timestamp=dummy_scene.acquisition_time, speed_m_s=1.5, direction_deg=0)
    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    w_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.WIND_CONTEXT)
    assert w_item.status == EvidenceStatus.CONTRADICTING
    assert "LIMITING / HIGH LOOK-ALIKE RISK" in w_item.interpretation

    # Test 2-3 m/s
    wind.speed_m_s = 2.5
    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    w_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.WIND_CONTEXT)
    assert w_item.status == EvidenceStatus.NEUTRAL
    assert "LOW-CONTRAST / CAUTION" in w_item.interpretation

    # Test 3-10 m/s
    wind.speed_m_s = 5.0
    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    w_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.WIND_CONTEXT)
    assert w_item.status == EvidenceStatus.SUPPORTING
    assert "FAVORABLE DETECTION CONTEXT" in w_item.interpretation

    # Test 10-12 m/s
    wind.speed_m_s = 11.0
    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    w_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.WIND_CONTEXT)
    assert w_item.status == EvidenceStatus.NEUTRAL
    assert "REDUCED DETECTABILITY" in w_item.interpretation

    # Test > 12 m/s
    wind.speed_m_s = 15.0
    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    w_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.WIND_CONTEXT)
    assert w_item.status == EvidenceStatus.NEUTRAL
    assert "LIMITING" in w_item.interpretation

def test_optical_cloud_obscured(dummy_scene, dummy_slick, dummy_assessment):
    service = EvidenceFusionService()
    wind = WindObservation(source="MOCK", provider="TEST", timestamp=dummy_scene.acquisition_time, speed_m_s=5.0, direction_deg=0)
    current = CurrentObservation(source="MOCK", provider="TEST", timestamp=dummy_scene.acquisition_time, speed_m_s=0.5, direction_deg=90)
    optical = OpticalAvailability(source="MOCK", provider="TEST", timestamp=dummy_scene.acquisition_time, status=OpticalAvailabilityStatus.CLOUD_OBSCURED)

    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    o_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.OPTICAL_CORROBORATION)
    assert o_item.status == EvidenceStatus.UNAVAILABLE

def test_temporal_mismatch(dummy_scene, dummy_slick, dummy_assessment):
    service = EvidenceFusionService()
    
    env_time = dummy_scene.acquisition_time - timedelta(hours=3)
    
    wind = WindObservation(source="MOCK", provider="TEST", timestamp=env_time, speed_m_s=5.0, direction_deg=0)
    current = CurrentObservation(source="MOCK", provider="TEST", timestamp=env_time, speed_m_s=0.5, direction_deg=90)
    optical = OpticalAvailability(source="MOCK", provider="TEST", timestamp=env_time, status=OpticalAvailabilityStatus.AVAILABLE)

    res = service.fuse_evidence("inv1", dummy_scene, dummy_slick, dummy_assessment, wind, current, optical)
    t_item = next(i for i in res.evidence_items if i.category == EvidenceCategory.TEMPORAL_CONSISTENCY)
    assert t_item.status == EvidenceStatus.NEUTRAL
    assert "Temporal offset of 3.0 hours limits" in t_item.interpretation
