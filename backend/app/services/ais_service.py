from typing import List, Any
from app.schemas.attribution import VesselCandidate
from datetime import datetime

class AISService:
    """
    Service contract for fetching and processing AIS data.
    """
    
    async def fetch_vessels_in_area(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, 
                                    start_time: datetime, end_time: datetime) -> List[VesselCandidate]:
        """
        Query AIS provider (e.g. Global Fishing Watch) for vessels in a spatiotemporal bounding box.
        """
        raise NotImplementedError

    async def fetch_vessel_track(self, mmsi: str, start_time: datetime, end_time: datetime) -> Any:
        """
        Fetch the exact trajectory of a specific vessel within a time window.
        """
        raise NotImplementedError
