"""
Generate a synthetic SAR oil-spill vs look-alike dataset that mirrors the
CSIRO Sentinel-1 Oil Spill Detection Dataset structure.

This generates 400x400 grayscale patches that simulate:
  - Class 0 (LOOKALIKE / NO_OIL): low-wind zones, biogenic films, current boundaries
  - Class 1 (OIL_LIKE): dark elongated features consistent with mineral oil

The synthetic data is used ONLY because external dataset download requires
authentication credentials not available in this environment.

The generator produces patches with:
  - Realistic SAR backscatter distributions (Rayleigh-distributed speckle)
  - Class-specific texture/morphology differences
  - Scene IDs to enable scene-wise train/test splitting
  - Documented generation parameters

THIS IS SYNTHETIC TRAINING DATA.
It approximates the statistical properties of real SAR oil/look-alike patches
but is NOT a substitute for real labeled Sentinel-1 data.
"""

import numpy as np
from PIL import Image
import os
import json
import csv


def generate_speckle_background(shape, mean_intensity=120, speckle_sigma=0.3):
    """Generate Rayleigh-distributed speckle noise typical of SAR imagery."""
    # Rayleigh speckle: intensity = mean * exponential(1)
    speckle = np.random.exponential(1.0, shape)
    background = mean_intensity * speckle
    # Add Gaussian sensor noise
    noise = np.random.normal(0, mean_intensity * 0.05, shape)
    return np.clip(background + noise, 0, 255).astype(np.float32)


def generate_oil_patch(shape=(400, 400), scene_seed=None):
    """
    Generate a synthetic SAR patch containing an oil-like dark feature.
    Oil slicks typically appear as elongated, smooth dark regions with
    reduced backscatter and dampened speckle.
    """
    rng = np.random.RandomState(scene_seed)

    # Background sea with speckle
    bg_mean = rng.uniform(100, 160)
    patch = generate_speckle_background(shape, mean_intensity=bg_mean, speckle_sigma=0.3)

    # Create an elongated dark region (oil-like)
    h, w = shape
    cy, cx = rng.randint(100, 300), rng.randint(100, 300)
    # Elongated ellipse
    a = rng.randint(60, 150)  # semi-major
    b = rng.randint(15, 50)   # semi-minor
    angle = rng.uniform(0, np.pi)

    y, x = np.ogrid[:h, :w]
    cos_a, sin_a = np.cos(angle), np.sin(angle)
    xr = cos_a * (x - cx) + sin_a * (y - cy)
    yr = -sin_a * (x - cx) + cos_a * (y - cy)
    ellipse_mask = (xr / a) ** 2 + (yr / b) ** 2 <= 1.0

    # Oil dampens backscatter significantly and reduces speckle variance
    oil_intensity = rng.uniform(20, 60)
    oil_region = np.random.normal(oil_intensity, oil_intensity * 0.1, shape).astype(np.float32)
    patch[ellipse_mask] = oil_region[ellipse_mask]

    # Smooth transition at edges
    from scipy.ndimage import gaussian_filter
    mask_float = ellipse_mask.astype(np.float32)
    smooth_mask = gaussian_filter(mask_float, sigma=5)
    patch = patch * (1 - smooth_mask) + oil_region * smooth_mask

    return np.clip(patch, 0, 255).astype(np.uint8)


def generate_lookalike_patch(shape=(400, 400), scene_seed=None):
    """
    Generate a synthetic SAR patch containing a look-alike dark feature.
    Look-alikes include: low-wind zones, biogenic films, current boundaries.
    They are typically less smooth, more irregular, and have less contrast.
    """
    rng = np.random.RandomState(scene_seed)

    # Background
    bg_mean = rng.uniform(100, 160)
    patch = generate_speckle_background(shape, mean_intensity=bg_mean, speckle_sigma=0.3)

    h, w = shape

    # Look-alikes: irregular shape, moderate contrast, more texture
    lookalike_type = rng.choice(['low_wind', 'biogenic', 'current'])

    if lookalike_type == 'low_wind':
        # Large diffuse dark area with high texture retention
        mask = np.zeros(shape, dtype=bool)
        # Random blob via thresholded noise
        noise_field = gaussian_filter(rng.randn(h, w), sigma=40)
        mask = noise_field > rng.uniform(-0.3, 0.3)
        # Only moderate darkening
        reduction = rng.uniform(0.6, 0.85)
        patch[mask] *= reduction

    elif lookalike_type == 'biogenic':
        # Thin streaky features along wind direction
        angle = rng.uniform(0, np.pi)
        for _ in range(rng.randint(3, 8)):
            cy = rng.randint(50, 350)
            cx = rng.randint(50, 350)
            length = rng.randint(80, 200)
            width_streak = rng.randint(3, 12)
            y, x = np.ogrid[:h, :w]
            cos_a, sin_a = np.cos(angle), np.sin(angle)
            along = cos_a * (x - cx) + sin_a * (y - cy)
            across = -sin_a * (x - cx) + cos_a * (y - cy)
            streak = (np.abs(along) < length / 2) & (np.abs(across) < width_streak / 2)
            patch[streak] *= rng.uniform(0.65, 0.85)

    elif lookalike_type == 'current':
        # Sharp linear boundary
        angle = rng.uniform(0, np.pi)
        y, x = np.ogrid[:h, :w]
        boundary = np.cos(angle) * (x - 200) + np.sin(angle) * (y - 200)
        side = boundary > rng.uniform(-30, 30)
        patch[side] *= rng.uniform(0.7, 0.9)

    return np.clip(patch, 0, 255).astype(np.uint8)


def generate_dataset(base_dir, n_oil=500, n_lookalike=1000, n_scenes=50):
    """
    Generate the full dataset with scene-level grouping.
    Each 'scene' contributes multiple patches to simulate
    the real-world scenario where patches are cropped from larger scenes.
    """
    os.makedirs(os.path.join(base_dir, 'oil'), exist_ok=True)
    os.makedirs(os.path.join(base_dir, 'lookalike'), exist_ok=True)

    metadata = []

    # Distribute patches across scenes
    oil_per_scene = max(1, n_oil // n_scenes)
    la_per_scene = max(1, n_lookalike // n_scenes)

    idx = 0
    for scene_id in range(n_scenes):
        scene_name = f"scene_{scene_id:04d}"

        # Each scene has both oil and lookalike patches (realistic)
        n_oil_this = oil_per_scene + np.random.randint(-2, 3)
        n_la_this = la_per_scene + np.random.randint(-2, 3)
        n_oil_this = max(1, n_oil_this)
        n_la_this = max(1, n_la_this)

        for j in range(n_oil_this):
            seed = scene_id * 10000 + j
            img = generate_oil_patch(scene_seed=seed)
            fname = f"oil_{idx:05d}.jpg"
            Image.fromarray(img, mode='L').save(os.path.join(base_dir, 'oil', fname))
            metadata.append({
                'filename': f'oil/{fname}',
                'label': 1,
                'class_name': 'OIL_LIKE',
                'scene_id': scene_name,
                'patch_idx': j,
                'generation_seed': seed
            })
            idx += 1

        for j in range(n_la_this):
            seed = scene_id * 10000 + 5000 + j
            img = generate_lookalike_patch(scene_seed=seed)
            fname = f"lookalike_{idx:05d}.jpg"
            Image.fromarray(img, mode='L').save(os.path.join(base_dir, 'lookalike', fname))
            metadata.append({
                'filename': f'lookalike/{fname}',
                'label': 0,
                'class_name': 'LOOKALIKE',
                'scene_id': scene_name,
                'patch_idx': j,
                'generation_seed': seed
            })
            idx += 1

    # Save metadata
    with open(os.path.join(base_dir, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    # Save summary
    oil_count = sum(1 for m in metadata if m['label'] == 1)
    la_count = sum(1 for m in metadata if m['label'] == 0)
    summary = {
        'total_patches': len(metadata),
        'oil_count': oil_count,
        'lookalike_count': la_count,
        'class_balance': f'{oil_count / len(metadata):.2%} oil, {la_count / len(metadata):.2%} lookalike',
        'n_scenes': n_scenes,
        'image_size': '400x400',
        'channels': 1,
        'dtype': 'uint8',
        'range': '0-255',
        'format': 'JPEG grayscale',
        'NOTE': 'SYNTHETIC TRAINING DATA - NOT REAL SENTINEL-1 OBSERVATIONS'
    }
    with open(os.path.join(base_dir, 'dataset_summary.json'), 'w') as f:
        json.dump(summary, f, indent=2)

    print(f"Generated {len(metadata)} patches across {n_scenes} scenes")
    print(f"  Oil: {oil_count}, Look-alike: {la_count}")
    print(f"  Balance: {summary['class_balance']}")
    return metadata


if __name__ == '__main__':
    from scipy.ndimage import gaussian_filter
    generate_dataset('data/csiro_synthetic', n_oil=500, n_lookalike=1000, n_scenes=50)
