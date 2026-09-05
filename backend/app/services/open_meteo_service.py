import httpx
import asyncio
from datetime import datetime, timezone
from dateutil import parser
from app.schemas.environment import (
    WindObservation,
    CurrentObservation,
    OpticalAvailability,
    OpticalAvailabilityStatus
)
from app.services.environmental_data_service import EnvironmentalDataService


class OpenMeteoEnvironmentalService(EnvironmentalDataService):
    """
    Real historical environmental data provider using Open-Meteo.
    Wraps Copernicus Marine Service (ocean currents) and ECMWF ERA5 (wind).
    """

    def __init__(self):
        self.wind_url = "https://archive-api.open-meteo.com/v1/archive"
        self.marine_url = "https://marine-api.open-meteo.com/v1/marine"
        self.timeout = 10.0  # seconds

    def _find_nearest_hourly_index(self, times: list[str], target_time: datetime) -> int:
        if not times:
            return -1
        
        target_ts = target_time.timestamp()
        best_idx = -1
        min_diff = float("inf")
        
        for i, t_str in enumerate(times):
            t_dt = parser.isoparse(t_str)
            # Ensure it is UTC aware for comparison
            if t_dt.tzinfo is None:
                t_dt = t_dt.replace(tzinfo=timezone.utc)
            
            diff = abs(t_dt.timestamp() - target_ts)
            if diff < min_diff:
                min_diff = diff
                best_idx = i
                
        # Must be within 90 minutes
        if min_diff > 90 * 60:
            return -1
            
        return best_idx

    async def get_wind(self, lat: float, lon: float, time: datetime) -> WindObservation:
        retrieval_time = datetime.now(timezone.utc)
        
        # Ensure UTC time for date formatting
        target_time = time
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)
            
        date_str = target_time.strftime("%Y-%m-%d")

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": date_str,
            "end_date": date_str,
            "hourly": "wind_speed_10m,wind_direction_10m"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.wind_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                
            times = data.get("hourly", {}).get("time", [])
            idx = self._find_nearest_hourly_index(times, target_time)
            
            if idx == -1:
                return WindObservation(
                    source="Open-Meteo / ECMWF ERA5",
                    provider="Open-Meteo",
                    dataset="ECMWF ERA5",
                    timestamp=target_time,
                    requested_lat=lat,
                    requested_lon=lon,
                    requested_timestamp=target_time,
                    retrieval_timestamp=retrieval_time,
                    api_endpoint=self.wind_url,
                    availability_status="UNAVAILABLE",
                    is_mock=False
                )
                
            obs_time = parser.isoparse(times[idx]).replace(tzinfo=timezone.utc)
            offset_hours = (obs_time.timestamp() - target_time.timestamp()) / 3600.0
            
            speed_kmh = data["hourly"]["wind_speed_10m"][idx]
            direction = data["hourly"]["wind_direction_10m"][idx]
            
            if speed_kmh is None or direction is None:
                return WindObservation(
                    source="Open-Meteo / ECMWF ERA5",
                    provider="Open-Meteo",
                    dataset="ECMWF ERA5",
                    timestamp=target_time,
                    requested_lat=lat,
                    requested_lon=lon,
                    requested_timestamp=target_time,
                    retrieval_timestamp=retrieval_time,
                    api_endpoint=self.wind_url,
                    availability_status="UNAVAILABLE",
                    is_mock=False
                )
                
            # Convert km/h to m/s
            speed_ms = speed_kmh * (1000.0 / 3600.0)

            return WindObservation(
                source="Open-Meteo / ECMWF ERA5",
                provider="Open-Meteo",
                dataset="ECMWF ERA5",
                timestamp=obs_time,
                resolution="~25km",
                requested_lat=lat,
                requested_lon=lon,
                returned_lat=data.get("latitude"),
                returned_lon=data.get("longitude"),
                requested_timestamp=target_time,
                time_offset_hours=offset_hours,
                retrieval_timestamp=retrieval_time,
                api_endpoint=self.wind_url,
                availability_status="AVAILABLE",
                is_mock=False,
                speed_m_s=speed_ms,
                direction_deg=float(direction)
            )

        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            # Fallback gracefully to UNAVAILABLE
            return WindObservation(
                source="Open-Meteo / ECMWF ERA5",
                provider="Open-Meteo",
                dataset="ECMWF ERA5",
                timestamp=target_time,
                requested_lat=lat,
                requested_lon=lon,
                requested_timestamp=target_time,
                retrieval_timestamp=retrieval_time,
                api_endpoint=self.wind_url,
                availability_status="UNAVAILABLE",
                is_mock=False
            )

    async def get_current(self, lat: float, lon: float, time: datetime) -> CurrentObservation:
        retrieval_time = datetime.now(timezone.utc)
        
        target_time = time
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)
            
        date_str = target_time.strftime("%Y-%m-%d")

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": date_str,
            "end_date": date_str,
            "hourly": "ocean_current_velocity,ocean_current_direction"
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(self.marine_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                
            times = data.get("hourly", {}).get("time", [])
            idx = self._find_nearest_hourly_index(times, target_time)
            
            if idx == -1:
                return CurrentObservation(
                    source="Open-Meteo / Copernicus Marine",
                    provider="Open-Meteo",
                    dataset="CMEMS Global Ocean Physics",
                    timestamp=target_time,
                    requested_lat=lat,
                    requested_lon=lon,
                    requested_timestamp=target_time,
                    retrieval_timestamp=retrieval_time,
                    api_endpoint=self.marine_url,
                    availability_status="UNAVAILABLE",
                    is_mock=False
                )
                
            obs_time = parser.isoparse(times[idx]).replace(tzinfo=timezone.utc)
            offset_hours = (obs_time.timestamp() - target_time.timestamp()) / 3600.0
            
            speed_kmh = data["hourly"]["ocean_current_velocity"][idx]
            direction = data["hourly"]["ocean_current_direction"][idx]
            
            if speed_kmh is None or direction is None:
                # E.g. coastal land boundary hit
                return CurrentObservation(
                    source="Open-Meteo / Copernicus Marine",
                    provider="Open-Meteo",
                    dataset="CMEMS Global Ocean Physics",
                    timestamp=target_time,
                    requested_lat=lat,
                    requested_lon=lon,
                    requested_timestamp=target_time,
                    retrieval_timestamp=retrieval_time,
                    api_endpoint=self.marine_url,
                    availability_status="UNAVAILABLE",
                    is_mock=False
                )
                
            # Convert km/h to m/s
            speed_ms = speed_kmh * (1000.0 / 3600.0)

            return CurrentObservation(
                source="Open-Meteo / Copernicus Marine",
                provider="Open-Meteo",
                dataset="CMEMS Global Ocean Physics",
                timestamp=obs_time,
                resolution="~9km",
                requested_lat=lat,
                requested_lon=lon,
                returned_lat=data.get("latitude"),
                returned_lon=data.get("longitude"),
                requested_timestamp=target_time,
                time_offset_hours=offset_hours,
                retrieval_timestamp=retrieval_time,
                api_endpoint=self.marine_url,
                availability_status="AVAILABLE",
                is_mock=False,
                speed_m_s=speed_ms,
                direction_deg=float(direction)
            )

        except (httpx.RequestError, httpx.HTTPStatusError) as e:
            # Fallback gracefully to UNAVAILABLE
            return CurrentObservation(
                source="Open-Meteo / Copernicus Marine",
                provider="Open-Meteo",
                dataset="CMEMS Global Ocean Physics",
                timestamp=target_time,
                requested_lat=lat,
                requested_lon=lon,
                requested_timestamp=target_time,
                retrieval_timestamp=retrieval_time,
                api_endpoint=self.marine_url,
                availability_status="UNAVAILABLE",
                is_mock=False
            )

    async def get_optical_availability(self, lat: float, lon: float, time: datetime) -> OpticalAvailability:
        # We don't have real optical availability implementation in Open-Meteo for this, 
        # so just gracefully fail to UNAVAILABLE/NOT_REQUESTED for LIVE usage.
        return OpticalAvailability(
            source="LIVE Provider (Optical Not Implemented)",
            provider="Open-Meteo",
            timestamp=time,
            resolution="UNKNOWN",
            is_mock=False,
            status=OpticalAvailabilityStatus.NOT_REQUESTED,
            availability_status="AVAILABLE"
        )
