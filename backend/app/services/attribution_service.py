from typing import List
from app.schemas.attribution import VesselCandidate, AttributionResult
from app.schemas.drift import OriginEstimate

class AttributionService:
    """
    Service contract for multi-factor vessel attribution scoring.
    CORE WORKFLOW: ATTRIBUTE
    """
    
    async def score_candidates(self, candidates: List[VesselCandidate], origin: OriginEstimate, 
                               metocean_data: list) -> List[AttributionResult]:
        """
        Score a list of vessel candidates against the 6-factor forensic matrix.
        Returns ranked AttributionResult objects.
        """
        raise NotImplementedError
