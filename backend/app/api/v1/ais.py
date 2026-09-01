from typing import List
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from datetime import datetime

from app.schemas.ais import VesselCandidate
from app.schemas.drift import OriginEstimate
from app.services.ais_service import AISService, MockAISProvider

router = APIRouter()


class CandidateQuery(BaseModel):
    origin: OriginEstimate
    start_time: datetime
    end_time: datetime


@router.post("/candidates", response_model=List[VesselCandidate])
async def discover_candidates(query: CandidateQuery):
    """
    Given an origin region and a time window, discovers AIS candidates.
    Uses MockAISProvider for prototype.
    """
    provider = MockAISProvider(query.origin)
    service = AISService(provider)

    candidates = await service.discover_candidates(
        origin=query.origin,
        start_time=query.start_time,
        end_time=query.end_time
    )

    return candidates
