from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.schemas.ais import VesselCandidate
from app.schemas.drift import OriginEstimate
from app.schemas.ais import VesselCandidate
from app.schemas.drift import OriginEstimate
from app.services.ais_service import AISService, MockAISProvider, AISProvider
from app.services.byod_ais_provider import BYODAISProvider

router = APIRouter()

class CandidateQuery(BaseModel):
    investigation_id: str
    origin: OriginEstimate
    start_time: datetime
    end_time: datetime
    mode: str = "MOCK"  # MOCK | BYOD | LIVE

@router.post("/candidates", response_model=List[VesselCandidate])
async def discover_candidates(query: CandidateQuery):
    """
    Given an origin region and a time window, discovers AIS candidates.
    Supports MOCK and BYOD provider modes.
    """
    if query.mode == "BYOD":
        provider: AISProvider = BYODAISProvider(investigation_id=query.investigation_id)
        # We don't verify file existence here, fetch_raw_positions will raise FileNotFoundError 
        # which will be caught by FastAPI as a 500. We can intercept and make it a 404 or 400.
        try:
            # Quick check
            import os
            if not os.path.exists(provider.storage_path):  # type: ignore
                raise HTTPException(status_code=400, detail=f"No BYOD dataset found for investigation {query.investigation_id}. Please upload one first.")
        except HTTPException:
            raise
        except Exception:
            pass
    elif query.mode == "MOCK":
        provider = MockAISProvider(query.origin)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported AIS provider mode: {query.mode}")
        
    service = AISService(provider)

    candidates = await service.discover_candidates(
        origin=query.origin,
        start_time=query.start_time,
        end_time=query.end_time
    )

    return candidates

@router.post("/upload")
async def upload_byod_ais(
    investigation_id: str = Form(...),
    declared_source: Optional[str] = Form(None),
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Uploads historical AIS dataset (CSV or JSON), parses it, and stores it for BYOD candidate discovery.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="File must have a filename.")
        
    filename = file.filename.lower()
    is_csv = filename.endswith(".csv")
    is_json = filename.endswith(".json")
    
    if not (is_csv or is_json):
        raise HTTPException(status_code=400, detail="Only .csv and .json files are supported.")
        
    content = await file.read()
    
    try:
        result = BYODAISProvider.import_dataset(
            investigation_id=investigation_id,
            content=content,
            is_csv=is_csv,
            declared_source=declared_source
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process upload: {str(e)}")
