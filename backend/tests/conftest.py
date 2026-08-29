import pytest
import numpy as np
import rasterio
from rasterio.transform import from_origin
import os

@pytest.fixture
def synthetic_scene_path(tmp_path):
    path = os.path.join(tmp_path, "synthetic_s1_test_scene.tif")
    
    width, height = 512, 512
    transform = from_origin(58.0, 24.5, 0.0001, 0.0001)
    
    # Generate background: Sentinel-1 typical sea backscatter in linear scale (~0.05, which is ~-13 dB)
    data = np.random.normal(0.05, 0.005, (height, width)).astype(np.float32)
    
    # Create a dark anomaly (oil slick candidate) in the center (~0.01, which is ~-20 dB)
    cy, cx = 256, 256
    radius = 40
    y, x = np.ogrid[:height, :width]
    mask = (x - cx)**2 + (y - cy)**2 <= radius**2
    
    data[mask] = np.random.normal(0.01, 0.002, np.sum(mask)).astype(np.float32)
    
    data = np.clip(data, 1e-6, 1.0)
    
    with rasterio.open(
        path,
        'w',
        driver='GTiff',
        height=height,
        width=width,
        count=1,
        dtype=str(data.dtype),
        crs='EPSG:4326',
        transform=transform,
        nodata=0.0
    ) as dst:
        dst.write(data, 1)
        dst.update_tags(POLARIZATION="VV", PRODUCT_TYPE="GRD", MISSION="TEST DATA ONLY")
        
    return path
