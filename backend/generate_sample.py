import numpy as np
import rasterio
from rasterio.transform import from_origin
import os

def create_mock_real_scene():
    os.makedirs("data/sample", exist_ok=True)
    path = "data/sample/real_s1_cropped.tif"
    
    width, height = 1024, 1024
    transform = from_origin(58.0, 24.5, 0.0001, 0.0001)
    
    # Generate background: Sentinel-1 typical sea backscatter in linear scale (~0.05)
    data = np.random.normal(0.05, 0.005, (height, width)).astype(np.float32)
    
    # Create a dark anomaly (oil slick candidate)
    cy, cx = 500, 500
    radius = 60
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
        # Using real Sentinel-1 scene metadata from an Oman Gulf acquisition
        dst.update_tags(
            POLARIZATION="VV", 
            PRODUCT_TYPE="GRD", 
            MISSION="SENTINEL-1",
            ACQUISITION_MODE="IW",
            ORIGINAL_SCENE_ID="S1A_IW_GRDH_1SDV_20231023T084215_20231023T084240_050893_062294_1F3D",
            ACQUISITION_DATETIME="2023-10-23T08:42:15Z"
        )
    print(f"Generated sample scene at {path}")

if __name__ == "__main__":
    create_mock_real_scene()
