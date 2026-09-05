import math
import asyncio
import tempfile
import numpy as np
import xarray as xr
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field
import httpx


class EnvironmentalForcingWindow(BaseModel):
    start_timestamp: datetime
    end_timestamp: datetime
    timestamps: List[datetime]
    latitudes: List[float]
    longitudes: List[float]
    wind_u: List[List[List[float]]]  # time, lat, lon
    wind_v: List[List[List[float]]]
    current_u: List[List[List[float]]]
    current_v: List[List[List[float]]]
    units: str = "m/s"
    spatial_resolution: str
    temporal_resolution: str
    provider: str
    dataset: str
    requested_coordinates: str
    returned_coordinates: str
    retrieval_timestamp: datetime
    limitations: str

    def to_netcdf(self) -> str:
        """
        Write the forcing window to a temporary NetCDF file formatted for OpenDrift.
        Returns the path to the temporary file.
        The caller is responsible for deleting the file after use.
        """
        # Convert to numpy arrays
        time_np = np.array([np.datetime64(t.replace(tzinfo=None)) for t in self.timestamps])
        lat_np = np.array(self.latitudes, dtype=np.float32)
        lon_np = np.array(self.longitudes, dtype=np.float32)

        # Arrays are time x lat x lon
        wind_u_np = np.array(self.wind_u, dtype=np.float32)
        wind_v_np = np.array(self.wind_v, dtype=np.float32)
        current_u_np = np.array(self.current_u, dtype=np.float32)
        current_v_np = np.array(self.current_v, dtype=np.float32)

        # Create xarray dataset
        ds = xr.Dataset(
            {
                "x_wind": (["time", "lat", "lon"], wind_u_np),
                "y_wind": (["time", "lat", "lon"], wind_v_np),
                "x_sea_water_velocity": (["time", "lat", "lon"], current_u_np),
                "y_sea_water_velocity": (["time", "lat", "lon"], current_v_np),
            },
            coords={
                "time": time_np,
                "lat": lat_np,
                "lon": lon_np,
            },
            attrs={
                "provider": self.provider,
                "dataset": self.dataset,
                "limitations": self.limitations
            }
        )

        # Standard CF metadata expected by OpenDrift
        ds["lon"].attrs = {"standard_name": "longitude", "units": "degrees_east"}
        ds["lat"].attrs = {"standard_name": "latitude", "units": "degrees_north"}
        ds["time"].attrs = {"standard_name": "time"}
        ds["x_wind"].attrs = {"standard_name": "x_wind", "units": "m/s"}
        ds["y_wind"].attrs = {"standard_name": "y_wind", "units": "m/s"}
        ds["x_sea_water_velocity"].attrs = {"standard_name": "x_sea_water_velocity", "units": "m/s"}
        ds["y_sea_water_velocity"].attrs = {"standard_name": "y_sea_water_velocity", "units": "m/s"}

        # Write to temporary file
        fd, path = tempfile.mkstemp(suffix=".nc", prefix="opendrift_forcing_")
        import os
        os.close(fd)
        ds.to_netcdf(path, format="NETCDF4")
        return path


class OpenMeteoForcingAdapter:
    """
    Retrieves spatial-temporal forcing fields from Open-Meteo.
    Converts speed/direction to U/V vectors.
    """
    def __init__(self):
        self.wind_url = "https://archive-api.open-meteo.com/v1/archive"
        self.marine_url = "https://marine-api.open-meteo.com/v1/marine"
        self.timeout = 30.0

    @staticmethod
    def convert_wind_to_uv(speed: float, direction_from_deg: float) -> tuple[float, float]:
        """
        Wind follows meteorological convention: direction FROM which wind blows.
        """
        if speed is None or direction_from_deg is None:
            return 0.0, 0.0
        # u = -s * sin(theta), v = -s * cos(theta)
        theta_rad = math.radians(direction_from_deg)
        u = -speed * math.sin(theta_rad)
        v = -speed * math.cos(theta_rad)
        return u, v

    @staticmethod
    def convert_current_to_uv(speed: float, direction_to_deg: float) -> tuple[float, float]:
        """
        Current follows oceanographic convention: direction TO which current flows.
        """
        if speed is None or direction_to_deg is None:
            return 0.0, 0.0
        # u = s * sin(theta), v = s * cos(theta)
        theta_rad = math.radians(direction_to_deg)
        u = speed * math.sin(theta_rad)
        v = speed * math.cos(theta_rad)
        return u, v

    async def _fetch_grid(
        self, client: httpx.AsyncClient, url: str, lats: List[float], lons: List[float],
        start_date: str, end_date: str, hourly_vars: str
    ) -> List[dict]:
        """
        Fetch data for a grid. Open-Meteo accepts multiple latitudes/longitudes as arrays.
        Maximum is usually 100 locations per request in the free API, so we chunk it if necessary.
        """
        MAX_LOCATIONS = 90
        results = []

        for i in range(0, len(lats), MAX_LOCATIONS):
            chunk_lats = lats[i:i + MAX_LOCATIONS]
            chunk_lons = lons[i:i + MAX_LOCATIONS]

            params = {
                "latitude": ",".join(map(str, chunk_lats)),
                "longitude": ",".join(map(str, chunk_lons)),
                "start_date": start_date,
                "end_date": end_date,
                "hourly": hourly_vars
            }
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            
            # If multiple locations were requested, it returns a list. If 1, it returns a dict.
            if isinstance(data, dict):
                data = [data]
            results.extend(data)

        return results

    async def get_forcing_window(
        self, center_lat: float, center_lon: float,
        start_time: datetime, end_time: datetime,
        half_width_deg: float = 0.5, grid_spacing_deg: float = 0.1
    ) -> EnvironmentalForcingWindow:
        retrieval_time = datetime.now(timezone.utc)

        # Force UTC
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        # Swap if reversed
        if start_time > end_time:
            start_time, end_time = end_time, start_time

        # Ensure we fetch enough days to cover the window (pad by 1 day to be safe)
        start_date_str = (start_time - timedelta(days=1)).strftime("%Y-%m-%d")
        end_date_str = (end_time + timedelta(days=1)).strftime("%Y-%m-%d")

        # Build grid
        # Add a small epsilon to the end to ensure range inclusive of boundary
        lat_range = np.arange(center_lat - half_width_deg, center_lat + half_width_deg + 0.0001, grid_spacing_deg)
        lon_range = np.arange(center_lon - half_width_deg, center_lon + half_width_deg + 0.0001, grid_spacing_deg)

        query_lats = []
        query_lons = []
        for lat in lat_range:
            for lon in lon_range:
                query_lats.append(round(float(lat), 4))
                query_lons.append(round(float(lon), 4))

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                wind_task = self._fetch_grid(
                    client, self.wind_url, query_lats, query_lons,
                    start_date_str, end_date_str, "wind_speed_10m,wind_direction_10m"
                )
                current_task = self._fetch_grid(
                    client, self.marine_url, query_lats, query_lons,
                    start_date_str, end_date_str, "ocean_current_velocity,ocean_current_direction"
                )

                wind_data, current_data = await asyncio.gather(wind_task, current_task)
        except Exception as e:
            raise ValueError(f"Failed to fetch environmental grid: {str(e)}")

        if not wind_data or not current_data:
            raise ValueError("No data returned from Open-Meteo")

        # Extract timestamps from first location (assuming consistent across grid)
        times_str = wind_data[0].get("hourly", {}).get("time", [])
        timestamps_all = [datetime.fromisoformat(t).replace(tzinfo=timezone.utc) for t in times_str]

        # Filter timestamps to our window
        # We might want 1 extra hour before/after for interpolation
        window_indices = [
            i for i, t in enumerate(timestamps_all)
            if start_time - timedelta(hours=1) <= t <= end_time + timedelta(hours=1)
        ]
        if not window_indices:
            raise ValueError("Insufficient temporal coverage in returned data")

        window_timestamps = [timestamps_all[i] for i in window_indices]
        num_times = len(window_timestamps)
        num_lats = len(lat_range)
        num_lons = len(lon_range)

        # Initialize arrays: time x lat x lon
        wind_u = [[[0.0 for _ in range(num_lons)] for _ in range(num_lats)] for _ in range(num_times)]
        wind_v = [[[0.0 for _ in range(num_lons)] for _ in range(num_lats)] for _ in range(num_times)]
        curr_u = [[[0.0 for _ in range(num_lons)] for _ in range(num_lats)] for _ in range(num_times)]
        curr_v = [[[0.0 for _ in range(num_lons)] for _ in range(num_lats)] for _ in range(num_times)]

        def safe_get(arr, idx):
            if arr is None or idx >= len(arr) or arr[idx] is None:
                return None
            return arr[idx]

        for loc_idx, (lat, lon) in enumerate(zip(query_lats, query_lons)):
            lat_idx = loc_idx // num_lons
            lon_idx = loc_idx % num_lons

            w_loc = wind_data[loc_idx]
            c_loc = current_data[loc_idx]

            w_speed_arr = w_loc.get("hourly", {}).get("wind_speed_10m", [])
            w_dir_arr = w_loc.get("hourly", {}).get("wind_direction_10m", [])
            
            c_speed_arr = c_loc.get("hourly", {}).get("ocean_current_velocity", [])
            c_dir_arr = c_loc.get("hourly", {}).get("ocean_current_direction", [])

            for t_mapped_idx, orig_t_idx in enumerate(window_indices):
                w_speed_kmh = safe_get(w_speed_arr, orig_t_idx)
                w_dir = safe_get(w_dir_arr, orig_t_idx)
                
                # Convert km/h to m/s
                w_speed_ms = w_speed_kmh * (1000.0 / 3600.0) if w_speed_kmh is not None else None
                u_w, v_w = self.convert_wind_to_uv(w_speed_ms, w_dir)
                
                wind_u[t_mapped_idx][lat_idx][lon_idx] = u_w
                wind_v[t_mapped_idx][lat_idx][lon_idx] = v_w

                c_speed_kmh = safe_get(c_speed_arr, orig_t_idx)
                c_dir = safe_get(c_dir_arr, orig_t_idx)
                
                c_speed_ms = c_speed_kmh * (1000.0 / 3600.0) if c_speed_kmh is not None else None
                u_c, v_c = self.convert_current_to_uv(c_speed_ms, c_dir)
                
                curr_u[t_mapped_idx][lat_idx][lon_idx] = u_c
                curr_v[t_mapped_idx][lat_idx][lon_idx] = v_c

        return EnvironmentalForcingWindow(
            start_timestamp=window_timestamps[0],
            end_timestamp=window_timestamps[-1],
            timestamps=window_timestamps,
            latitudes=lat_range.tolist(),
            longitudes=lon_range.tolist(),
            wind_u=wind_u,
            wind_v=wind_v,
            current_u=curr_u,
            current_v=curr_v,
            units="m/s",
            spatial_resolution=f"{grid_spacing_deg} deg",
            temporal_resolution="1 hour",
            provider="Open-Meteo",
            dataset="ERA5 (Wind) / CMEMS (Current)",
            requested_coordinates=f"Center: {center_lat},{center_lon} +/- {half_width_deg}",
            returned_coordinates=f"{len(query_lats)} points grid",
            retrieval_timestamp=retrieval_time,
            limitations="Grid constructed from point requests. Missing values treated as 0."
        )
