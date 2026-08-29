from typing import List, Optional
from app.schemas.satellite import SatelliteScene
from datetime import datetime

class SatelliteService:
    """
    Service contract for satellite imagery acquisition and management.
    """
    
    async def fetch_available_scenes(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, 
                                     start_time: datetime, end_time: datetime) -> List[SatelliteScene]:
        """
        Query providers (e.g. Sentinel Hub) for available scenes matching parameters.
        """
        raise NotImplementedError
        
    async def download_scene(self, scene_id: str) -> str:
        """
        Download or cache a specific scene locally/to cloud storage.
        Returns the path/URI.
        """
        raise NotImplementedError
