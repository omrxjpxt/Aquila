from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class InvestigationBase(BaseModel):
    title: str = Field(..., description="Human readable title or reference for the investigation")
    status: str = Field(
        default="OPEN",
        description="Current status of investigation (e.g. OPEN, CLOSED, PENDING_ANALYSIS)")
    priority: str = Field(default="NORMAL", description="Priority level (e.g. LOW, NORMAL, HIGH, CRITICAL)")
    description: Optional[str] = None
    
    creation_mode: str = Field(default="MANUAL", description="AUTOMATIC_MONITORING or MANUAL")
    source_product_id: Optional[str] = Field(None, description="CDSE Product UUID for automatic investigations")
    monitoring_zone_id: Optional[str] = Field(None, description="Monitoring zone that triggered this")
    anomaly_id: Optional[str] = Field(None, description="Unique candidate fingerprint/ID for deduplication")
    anomaly_geometry: Optional[Dict[str, Any]] = Field(None, description="GeoJSON geometry of the anomaly")


class InvestigationCreate(InvestigationBase):
    pass


class Investigation(InvestigationBase):
    id: str = Field(..., description="Unique investigation identifier (e.g. INV-2023-889)")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
