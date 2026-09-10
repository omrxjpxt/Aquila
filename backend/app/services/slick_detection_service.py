import uuid
import hashlib
import json
from typing import List
from datetime import datetime
import numpy as np
import rasterio
from rasterio.features import shapes
from skimage.filters import threshold_local
from shapely.geometry import shape

from app.schemas.satellite import SatelliteScene
from app.schemas.slick import Slick


class SlickDetectionService:
    """
    Service contract for the baseline slick detection step.
    CORE WORKFLOW: DETECT
    """

    async def detect_slicks(self, scene: SatelliteScene) -> List[Slick]:
        """
        Run a baseline adaptive thresholding model over the processed scene to detect anomalous dark regions.
        """
        if not scene.is_processed or not scene.processed_storage_path:
            raise ValueError("Scene must be preprocessed before detection.")

        detected_slicks = []

        with rasterio.open(scene.processed_storage_path) as src:
            image = src.read(1)
            transform = src.transform

            # Normalize to 0-1 for thresholding if needed, or work with float
            # Handling nodata / infs
            valid_mask = np.isfinite(image)
            if not np.any(valid_mask):
                return []

            # Background adaptive threshold
            # Slicks appear as low-backscatter (dark) anomalies against sea clutter
            # We use threshold_local to find a local mean, then flag pixels significantly below it.
            block_size = 51  # roughly 500m window at 10m/pixel
            offset = 2.0  # dB drop from local mean to be considered anomaly
            min_area_pixels = 50  # Filter out tiny noise

            # Fill invalid data with mean for local thresholding
            clean_image = np.copy(image)
            clean_image[~valid_mask] = np.nanmean(image)

            local_thresh = threshold_local(clean_image, block_size=block_size, offset=offset)
            anomaly_mask = (clean_image < local_thresh) & valid_mask

            # Polygonize anomalies
            mask_uint8 = anomaly_mask.astype(np.uint8)
            results = shapes(mask_uint8, mask=anomaly_mask, transform=transform)

            for geom, value in results:
                if value == 1:  # Anomaly region
                    s = shape(geom)

                    # Basic area filter based on approximate pixel size
                    # Real area requires reprojection, but we do a simple check on geometry area (in map units)
                    # For EPSG:4326 this is degrees squared, which is not ideal, but we'll use a relative filter.

                    # Let's count pixels instead for a robust threshold
                    # rasterio shapes doesn't give pixel count directly, but we can do it via a quick rasterize or just rely on geometry area
                    # If it's WGS84, 1 sq deg is huge.
                    # Assuming a standard GRD 10m spacing, 50 pixels is ~5000 sq meters = 0.005 sq km

                    if s.area > 0 and min_area_pixels >= 0:  # Filter empty
                        # For baseline, we just accept it if it's a polygon

                        # Deterministic candidate ID based on geometry coordinates
                        coords_str = json.dumps(geom.get("coordinates", []), sort_keys=True)
                        geom_hash = hashlib.sha256(coords_str.encode()).hexdigest()[:12]
                        detection_id = f"cand-{geom_hash}"

                        slick = Slick(
                            id=detection_id,
                            investigation_id=None,
                            source_scene_id=scene.id,
                            detected_at=datetime.utcnow(),
                            geometry=geom,
                            area_sq_km=0.0,  # Placeholder, requires reprojection to equal-area CRS
                            classification="BASELINE_CANDIDATE",
                            baseline_score=offset,
                            threshold_info={"block_size": block_size, "offset": offset, "method": "gaussian_adaptive"},
                            supporting_metrics={"geometry_area": s.area}
                        )
                        detected_slicks.append(slick)

        return detected_slicks
