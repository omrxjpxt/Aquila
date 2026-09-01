import os
import rasterio
import numpy as np
from datetime import datetime
from scipy.ndimage import gaussian_filter
from app.schemas.satellite import SatelliteScene, SceneIngestRequest, ProcessingResult


class SatelliteService:
    """
    Service contract for satellite imagery acquisition and management.
    """

    def __init__(self):
        self.scenes_dir = "data/scenes"
        os.makedirs(self.scenes_dir, exist_ok=True)

    async def ingest_local_scene(self, request: SceneIngestRequest) -> SatelliteScene:
        """
        Ingest a local Sentinel-1 GRD GeoTIFF.
        Validates metadata and returns a SatelliteScene object.
        """
        if not os.path.exists(request.file_path):
            raise FileNotFoundError(f"Scene file not found: {request.file_path}")

        with rasterio.open(request.file_path) as src:
            width = src.width
            height = src.height
            crs = str(src.crs) if src.crs else "EPSG:4326"
            bounds = src.bounds
            bbox = (bounds.left, bounds.bottom, bounds.right, bounds.top)

            # Extract tags if available, else use defaults
            tags = src.tags()

        scene_id = request.scene_id or f"local-scene-{int(datetime.utcnow().timestamp())}"
        acq_time = request.acquisition_time or datetime.utcnow()

        # We assume standard Sentinel-1 GRD VV for this pipeline baseline
        polarization = tags.get('POLARIZATION', 'VV')

        scene = SatelliteScene(
            id=scene_id,
            provider=request.provider,
            acquisition_time=acq_time,
            bbox=bbox,
            width=width,
            height=height,
            crs=crs,
            raw_storage_path=request.file_path,
            polarization=polarization
        )
        return scene

    async def preprocess_scene(self, scene: SatelliteScene) -> ProcessingResult:
        """
        Convert to dB if linear, apply speckle filtering, and save normalized raster.
        """
        start_time = datetime.utcnow()

        if not os.path.exists(scene.raw_storage_path):
            raise FileNotFoundError(f"Raw scene file not found: {scene.raw_storage_path}")

        processed_path = os.path.join(self.scenes_dir, f"{scene.id}_processed.tif")

        with rasterio.open(scene.raw_storage_path) as src:
            meta = src.meta.copy()
            data = src.read(1)
            nodata_val = src.nodata

            # Mask out nodata
            mask = np.ones_like(data, dtype=bool)
            if nodata_val is not None:
                mask = data != nodata_val
            elif np.isnan(data).any():
                mask = ~np.isnan(data)

            # Convert to dB if values are not already in dB (assuming linear intensity if max > 0 and typical dB is negative)
            # Sentinel-1 GRD linear amplitude is positive.
            valid_data = data[mask]

            if len(valid_data) > 0:
                # Basic check: if we have values > 0 and max > 1, it's likely linear.
                # True dB values for backscatter are usually between -30 and 0.
                if np.max(valid_data) > 0 or np.min(valid_data) >= 0:
                    # Convert to sigma0 dB (assuming data is intensity).
                    # Avoid log of zero
                    epsilon = 1e-10
                    data_db = np.zeros_like(data, dtype=np.float32)
                    data_db[mask] = 10 * np.log10(valid_data + epsilon)
                    if nodata_val is not None:
                        data_db[~mask] = nodata_val
                    else:
                        data_db[~mask] = np.nan
                    data = data_db

            # Apply Gaussian smoothing (speckle filter approximation)
            # We only filter the valid mask region to avoid bleeding nodata
            filtered_data = np.copy(data)

            # Simple approach: smooth the whole array but restore nodata
            # In a real pipeline, we'd use Lee or Frost filter.
            smoothed = gaussian_filter(data, sigma=2.0)

            filtered_data[mask] = smoothed[mask]

            meta.update(dtype=rasterio.float32)

            with rasterio.open(processed_path, 'w', **meta) as dst:
                dst.write(filtered_data.astype(rasterio.float32), 1)

        processing_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

        return ProcessingResult(
            scene_id=scene.id,
            processed_path=processed_path,
            processing_time_ms=processing_time_ms,
            message="Preprocessing complete (dB conversion + Gaussian filter)"
        )
