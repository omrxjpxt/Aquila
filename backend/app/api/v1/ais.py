import logging
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from datetime import datetime

from app.schemas.ais import VesselCandidate, FleetResponse, VesselDetailResponse
from app.schemas.drift import OriginEstimate
from app.services.ais_service import AISService, MockAISProvider, AISProvider
from app.services.byod_ais_provider import BYODAISProvider
from app.services.gfw_ais_provider import GFWAISProvider
from app.services.repositories.factory import get_investigation_repository

logger = logging.getLogger(__name__)

candidates_db = {}
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
    elif query.mode in ["LIVE", "GFW"]:
        from app.core.config import settings
        from shapely.geometry import Polygon
        if not settings.GFW_API_TOKEN:
            raise HTTPException(
                status_code=503,
                detail="Global Fishing Watch provider is UNAVAILABLE because GFW_API_TOKEN is not configured in backend environment."
            )
        gfw_provider = GFWAISProvider()
        poly = Polygon(query.origin.geometry["coordinates"][0])
        min_lon, min_lat, max_lon, max_lat = poly.bounds
        min_lon -= 0.5
        min_lat -= 0.5
        max_lon += 0.5
        max_lat += 0.5
        records, prov = await gfw_provider.search_vessel_presence(
            min_lon=min_lon,
            min_lat=min_lat,
            max_lon=max_lon,
            max_lat=max_lat,
            start_time=query.start_time,
            end_time=query.end_time
        )
        if not records:
            return []

        records_by_vessel: Dict[str, List[Any]] = {}
        for r in records:
            records_by_vessel.setdefault(r.vessel_id, []).append(r)

        mmsi_list = [vid for vid in records_by_vessel.keys() if vid.isdigit()]
        identities = await gfw_provider.get_vessel_identities(mmsi_list)
        id_map = {idx.mmsi: idx for idx in identities}

        from app.schemas.ais import AISPosition, AISTrack, AISProvenance
        candidates = []
        for vid, recs in records_by_vessel.items():
            positions = [
                AISPosition(
                    timestamp=r.timestamp,
                    lon=r.lon,
                    lat=r.lat,
                    speed_knots=None,
                    heading=None,
                    quality="GFW_PRESENCE"
                )
                for r in sorted(recs, key=lambda x: x.timestamp)
            ]
            coords = [[p.lon, p.lat] for p in positions]
            track_geom = {"type": "MultiLineString", "coordinates": [coords]} if len(coords) >= 2 else {"type": "MultiLineString", "coordinates": []}
            track = AISTrack(
                mmsi=vid,
                geometry=track_geom,
                positions=positions,
                total_observations=len(positions),
                coverage_quality="LIMITED" if len(positions) < 5 else "MODERATE"
            )
            candidates.append(VesselCandidate(
                id=f"cand_gfw_{vid}",
                investigation_id=query.investigation_id,
                identity=id_map.get(vid, VesselIdentity(mmsi=vid)),
                track=track,
                spatially_relevant=True,
                temporally_relevant=True,
                inside_origin_region=False,
                provenance=AISProvenance(
                    mode="LIVE",
                    source="Global Fishing Watch",
                    limitations="Aggregated vessel presence (~1 pos/hr). Not continuous raw AIS track."
                )
            ))
        return candidates
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


@router.get("/fleet", response_model=FleetResponse)
async def get_global_fleet(query: Optional[str] = None, limit: int = 50):
    """
    Retrieves global fleet vessels from the configured AIS provider (Global Fishing Watch).
    Returns an honest UNAVAILABLE status if GFW_API_TOKEN is not configured.
    Also provides dynamic active_investigations_count from SQLite investigations repository.
    """
    provider = GFWAISProvider()
    response = await provider.get_fleet(query=query, limit=limit)

    # Enrich with real active investigations count from repository
    try:
        repo = get_investigation_repository()
        invs = repo.list_investigations()
        response.active_investigations_count = len([i for i in invs if i.status in ["OPEN", "IN_PROGRESS"]])
    except Exception as e:
        logger.warning("Could not count active investigations: %s", e)
        response.active_investigations_count = 0

    return response


@router.get("/vessels/{mmsi}", response_model=VesselDetailResponse)
async def get_vessel_details(mmsi: str):
    """
    Retrieves individual vessel details by MMSI from Global Fishing Watch.
    Returns UNAVAILABLE if provider is not configured, or NOT_FOUND if vessel is missing.
    """
    cleaned_mmsi = mmsi.strip()
    if not cleaned_mmsi.isdigit() or len(cleaned_mmsi) < 7 or len(cleaned_mmsi) > 9:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid MMSI: '{mmsi}'. MMSI must be a numeric string between 7 and 9 digits."
        )
    provider = GFWAISProvider()
    return await provider.get_vessel_by_mmsi(mmsi=cleaned_mmsi)

