import pytest
import json
from pathlib import Path

VALIDATION_DIR = Path(__file__).parent.parent / "data" / "validation"
TRAIN_MANIFEST = VALIDATION_DIR / "phase_11e_train_manifest.json"
VAL_MANIFEST = VALIDATION_DIR / "phase_11e_val_manifest.json"
TEST_MANIFEST = VALIDATION_DIR / "phase_11d_manifest.json"

@pytest.fixture
def manifests():
    if not (TRAIN_MANIFEST.exists() and VAL_MANIFEST.exists() and TEST_MANIFEST.exists()):
        pytest.skip("Manifests not built yet")
        
    with open(TRAIN_MANIFEST) as f:
        train_data = json.load(f)
    with open(VAL_MANIFEST) as f:
        val_data = json.load(f)
    with open(TEST_MANIFEST) as f:
        test_data = json.load(f)
        
    return train_data, val_data, test_data

def test_scene_level_splitting_isolation(manifests):
    train_data, val_data, test_data = manifests
    
    train_scenes = {item["scene_id"] for item in train_data}
    val_scenes = {item["scene_id"] for item in val_data}
    test_scenes = {item["scene_id"] for item in test_data}
    
    # Assert pairwise disjoint
    assert len(train_scenes.intersection(val_scenes)) == 0, "Data leakage: Overlap between TRAIN and VAL scenes"
    assert len(train_scenes.intersection(test_scenes)) == 0, "Data leakage: Overlap between TRAIN and TEST scenes"
    assert len(val_scenes.intersection(test_scenes)) == 0, "Data leakage: Overlap between VAL and TEST scenes"

def test_patch_uniqueness(manifests):
    train_data, val_data, test_data = manifests
    
    train_patches = {item["sample_id"] for item in train_data}
    val_patches = {item["sample_id"] for item in val_data}
    test_patches = {item["sample_id"] for item in test_data}
    
    assert len(train_patches.intersection(val_patches)) == 0
    assert len(train_patches.intersection(test_patches)) == 0
    assert len(val_patches.intersection(test_patches)) == 0
