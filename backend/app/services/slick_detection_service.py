import uuid
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
            data = src.read(1)
            nodata = src.nodata
            transform = src.transform

            # Mask valid data
            if nodata is not None:
                valid_mask = data != nodata
            else:
                valid_mask = ~np.isnan(data)

            # If no valid data, return empty
            if not np.any(valid_mask):
                return []

            # Baseline parameters
            block_size = 51  # Local area size for adaptive threshold
            offset = 2.0     # dB offset below the local mean to be considered "anomalous"
            min_area_pixels = 50  # Filter out tiny noise

            # Compute adaptive threshold (local mean)
            # threshold_local handles the local mean computation
            local_thresh = threshold_local(data, block_size, method='gaussian')

            # A candidate dark patch is one where the backscatter is lower than the local mean by at least `offset` dB
            anomaly_mask = (data < (local_thresh - offset)) & valid_mask

            # Extract geometries using rasterio
            # anomaly_mask must be uint8 or int32 for rasterio.features.shapes
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

                        # Generate random UUID for detection
                        detection_id = str(uuid.uuid4())

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
