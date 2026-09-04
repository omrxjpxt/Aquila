from typing import Optional, Tuple, Any, Dict, List
from pydantic import BaseModel, Field
import datetime


class SatelliteScene(BaseModel):
    id: str = Field(..., description="Unique scene identifier")
    provider: str = Field(..., description="Source provider (e.g. SENTINEL_1)")
    product_type: str = Field(default="GRD", description="Product type (e.g. GRD, SLC)")
    acquisition_mode: str = Field(default="IW", description="Acquisition mode (e.g. IW, EW)")
    polarization: str = Field(default="VV", description="Polarization channel (e.g. VV, VH)")

    acquisition_time: datetime.datetime = Field(..., description="Time the scene was acquired")

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
    
    # Phase 11B Provenance tracking
    source: Optional[str] = Field(default=None, description="Source (e.g. CDSE)")
    provenance: Optional[str] = Field(default=None, description="Mode/provenance (e.g. LIVE, MOCK)")
    retrieval_api: Optional[str] = Field(default=None, description="API used for retrieval")
    original_stac_scene_id: Optional[str] = Field(default=None, description="Original STAC Scene ID")
    collection: Optional[str] = Field(default=None, description="Collection name")
    backscatter_coefficient: Optional[str] = Field(default=None, description="E.g. SIGMA0_ELLIPSOID")
    orthorectified: Optional[bool] = Field(default=None, description="Was it orthorectified?")
    retrieval_timestamp: Optional[datetime.datetime] = Field(default=None, description="When the raster was retrieved")


class SceneIngestRequest(BaseModel):
    file_path: str = Field(..., description="Local path to the GeoTIFF file")
    provider: str = Field(default="SENTINEL_1")
    # For a real system, you might pass scene ID or extract it from metadata
    scene_id: Optional[str] = None
    acquisition_time: Optional[datetime.datetime] = None
    
    # Optional metadata to pass through to the created scene
    source: Optional[str] = None
    provenance: Optional[str] = None
    retrieval_api: Optional[str] = None
    original_stac_scene_id: Optional[str] = None
    collection: Optional[str] = None
    polarization: Optional[str] = None
    backscatter_coefficient: Optional[str] = None
    orthorectified: Optional[bool] = None
    retrieval_timestamp: Optional[datetime.datetime] = None


class ProcessingResult(BaseModel):
    scene_id: str
    processed_path: str
    processing_time_ms: float
    message: str


class SatelliteSearchResult(BaseModel):
    id: str = Field(..., description="Unique scene identifier")
    source: str = Field(..., description="Source provider (e.g. CDSE)")
    provenance: str = Field(..., description="Mode/provenance (e.g. LIVE, MOCK)")
    
    collection: str = Field(default="sentinel-1-grd", description="STAC Collection")
    acquisition_time: datetime.datetime = Field(..., description="Time the scene was acquired")
    
    # Bounding box of the scene [min_lon, min_lat, max_lon, max_lat]
    bbox: Tuple[float, float, float, float]
    
    geometry: Dict[str, Any] = Field(..., description="GeoJSON geometry of the footprint")
    
    # Sentinel-1 specific metadata
    platform: Optional[str] = Field(default=None, description="Platform (e.g. sentinel-1a)")
    orbit_direction: Optional[str] = Field(default=None, description="Orbit direction (ascending/descending)")
    polarization: Optional[str] = Field(default=None, description="Polarization channels")
    instrument_mode: Optional[str] = Field(default=None, description="Instrument mode (e.g. IW)")
    
    thumbnail_url: Optional[str] = Field(default=None, description="URL to the quicklook thumbnail")


class SatelliteRetrievalRequest(BaseModel):
    scene: SatelliteSearchResult
    bbox: Tuple[float, float, float, float] = Field(..., description="AOI Bounding box [min_lon, min_lat, max_lon, max_lat]")
    width: Optional[int] = Field(default=None, description="Requested raster width (px)")
    height: Optional[int] = Field(default=None, description="Requested raster height (px)")

