from typing import Optional, Tuple, Any
from pydantic import BaseModel, Field
from datetime import datetime


class SatelliteScene(BaseModel):
    id: str = Field(..., description="Unique scene identifier")
    provider: str = Field(..., description="Source provider (e.g. SENTINEL_1)")
    product_type: str = Field(default="GRD", description="Product type (e.g. GRD, SLC)")
    acquisition_mode: str = Field(default="IW", description="Acquisition mode (e.g. IW, EW)")
    polarization: str = Field(default="VV", description="Polarization channel (e.g. VV, VH)")

    acquisition_time: datetime = Field(..., description="Time the scene was acquired")

    # Bounding box of the scene [min_lon, min_lat, max_lon, max_lat]
    bbox: Tuple[float, float, float, float]

    width: int = Field(..., description="Raster width in pixels")
    height: int = Field(..., description="Raster height in pixels")
    crs: str = Field(..., description="Coordinate Reference System (e.g. EPSG:4326)")

    # Path to local raw/processed files
    raw_storage_path: str = Field(..., description="URI or path to the raw asset")
    processed_storage_path: Optional[str] = Field(default=None,
                                                  description="URI or path to the normalized processed asset")

    is_processed: bool = Field(default=False, description="Has the scene been preprocessed?")


class SceneIngestRequest(BaseModel):
    file_path: str = Field(..., description="Local path to the GeoTIFF file")
    provider: str = Field(default="SENTINEL_1")
    # For a real system, you might pass scene ID or extract it from metadata
    scene_id: Optional[str] = None
    acquisition_time: Optional[datetime] = None


class ProcessingResult(BaseModel):
    scene_id: str
    processed_path: str
    processing_time_ms: float
    message: str
