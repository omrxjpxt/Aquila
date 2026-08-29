from typing import Any
from datetime import datetime

class EnvironmentalDataService:
    """
    Service contract for fetching metocean data (currents, winds, temperature).
    Supports validation (wind shadows) and drift reconstruction.
    """
    
    async def fetch_wind_data(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, 
                              time: datetime) -> Any:
        """
        Fetch wind data (e.g. from ERA5 / CDS).
        """
        raise NotImplementedError
        
    async def fetch_ocean_currents(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float, 
                                   start_time: datetime, end_time: datetime) -> Any:
        """
        Fetch ocean currents (e.g. from Copernicus Marine).
        """
        raise NotImplementedError
