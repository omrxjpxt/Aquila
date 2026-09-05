# Phase 12A — Environmental Provider Research & Design

## 1. Providers Investigated

### A. Open-Meteo (Marine & Historical APIs)
*   **Source Data**: ECMWF ERA5 (Weather/Wind) and Copernicus Marine Service (Ocean Currents).
*   **API**: REST / JSON.
*   **Coverage**: Global.

### B. Copernicus Marine Service (CMEMS)
*   **Source Data**: CMEMS Global Ocean Physics Reanalysis/Analysis.
*   **API**: Copernicus Marine Toolbox (Python API), OpenDAP.
*   **Coverage**: Global.

### C. NOAA ERDDAP (e.g., OSCAR, CoastWatch)
*   **Source Data**: OSCAR, NCEP, CCMP.
*   **API**: REST / JSON / NetCDF / CSV.
*   **Coverage**: Global (dependent on dataset).

## 2. Official API / Documentation References
*   **Open-Meteo Historical Weather API**: `https://open-meteo.com/en/docs/historical-weather-api`
*   **Open-Meteo Marine API**: `https://open-meteo.com/en/docs/marine-api`
*   **Copernicus Marine Toolbox**: `https://help.marine.copernicus.eu/en/articles/7970514-copernicus-marine-toolbox-introduction`

## 3. Selected Provider
**Open-Meteo** (Combining `archive-api.open-meteo.com` and `marine-api.open-meteo.com`).

## 4. Reasons for Selection
1.  **Scientific Credibility**: Open-Meteo acts as a lightweight wrapper directly querying **Copernicus Marine** and **ECMWF ERA5** models, perfectly satisfying AQUILA's scientific standards for Copernicus data usage.
2.  **Architectural Fit**: It provides a blazing fast synchronous REST JSON API. This allows immediate Point-In-Time evaluation matching the Sentinel-1 scene, without needing async file downloads or caching large NetCDF chunks.
3.  **Hackathon Suitability**: Absolutely zero authentication required. Free, open-source, no API keys, and no rate limits for typical hackathon loads.
4.  **Simplicity**: Consuming JSON with HTTP GET is significantly more robust than installing `copernicusmarine` and dealing with xarray/netcdf4 dependencies in a lightweight backend.

## 5. Rejected Alternatives
*   **Copernicus Marine Service (Native API)**: Rejected due to high latency and architectural complexity. CMEMS is designed for subsetting and downloading NetCDF files. A single point query for a lat/lon/time often requires downloading an entire chunk, taking seconds or minutes, which breaks synchronous API behavior for a hackathon demo.
*   **NOAA ERDDAP**: Rejected because combining wind and currents requires querying entirely separate, disjointed datasets with differing temporal/spatial resolutions (e.g., CCMP vs. OSCAR). Open-Meteo consolidates these natively.

## 6. Authentication Requirements
*   **None**. The API is completely public and open. No environment variables are required.

## 7. Endpoint Structure
*   **Wind**: `GET https://archive-api.open-meteo.com/v1/archive`
    *   Params: `latitude`, `longitude`, `start_date`, `end_date`, `hourly=wind_speed_10m,wind_direction_10m`
*   **Currents**: `GET https://marine-api.open-meteo.com/v1/marine`
    *   Params: `latitude`, `longitude`, `start_date`, `end_date`, `hourly=ocean_current_velocity,ocean_current_direction`

## 8. Data Fields & 9. Units
*   **Wind Speed**: `wind_speed_10m` (km/h)
*   **Wind Direction**: `wind_direction_10m` (degrees)
*   **Ocean Current Velocity**: `ocean_current_velocity` (km/h)
*   **Ocean Current Direction**: `ocean_current_direction` (degrees)

## 10. Temporal / Spatial Resolution
*   **Temporal**: Hourly interpolation.
*   **Spatial**: 
    *   Wind (ERA5): 0.25° (~25km)
    *   Currents (Copernicus): 0.08° (~9km)

## 11. Historical Availability
*   **Wind**: Since 1940 (ERA5).
*   **Currents**: Highly available for recent historical dates. Fully supports our target test scene from May 2024.

## 12. Licensing / Access Considerations
*   Open-Meteo APIs are free for non-commercial use (perfect for a hackathon). Attribution is required.
*   Data is governed by Copernicus and ECMWF open data licenses.

## 13. Proposed Python Integration Architecture
```python
# app/services/environmental_service.py
import httpx
from datetime import datetime

class OpenMeteoEnvironmentalService(EnvironmentalProvider):
    async def get_wind(self, lat: float, lon: float, timestamp: datetime):
        # GET archive-api.open-meteo.com
        # Parse nearest hourly index
        # Return structured WindObservation
        pass
        
    async def get_current(self, lat: float, lon: float, timestamp: datetime):
        # GET marine-api.open-meteo.com
        # Parse nearest hourly index
        # Return structured CurrentObservation
        pass
```

## 14. Validation Using Existing Sentinel-1 Scene
**Target Scene**: `S1A_IW_GRDH_1SDV_20240527T172235_20240527T172300_054060_0692AB_D9A4_COG.SAFE`
**Location**: Corsica [42.25, 9.5]
**Timestamp**: 2024-05-27 17:00Z

**Validation Script Results:**
*   **Wind (17:00Z)**: Speed 5.4 km/h, Direction 188° (Returned successfully via `archive-api`).
*   **Current (17:00Z)**: Speed 0.4 km/h, Direction 27° (Returned successfully via `marine-api`).

*Note: Coastal edge coordinates (e.g. 42.225, 9.225) resulted in `null` currents due to falling on land boundaries in the 0.08° CMEMS model grid. The service will seamlessly return `UNAVAILABLE` for these points.*

## 15. Known Limitations
1.  **Coastal Boundary Masking**: As seen in validation, ocean currents are highly masked near the exact coastline. Slicks right against the shore will return `UNAVAILABLE` current data.
2.  **Point Constraints**: The free API limits extracting massive bounding boxes at once (though point-queries are fully unconstrained).
3.  **Hourly Granularity**: Data is provided at hourly steps. The timestamp will require nearest-hour interpolation.

## 16. Implementation Plan for Phase 12B
1.  Define the strict abstract `EnvironmentalProvider` contract (inputs: lat, lon, time; outputs: standard observation dicts or Pydantic models).
2.  Implement `OpenMeteoEnvironmentalService` conforming to this contract.
3.  Inject the new service into the pipeline (via config `USE_REAL_ENVIRONMENTAL_DATA=true` or directly swap the provider instance if globally selected).
4.  Map the real wind and current data directly to the existing evidence/provenance structures (`SUPPORTING`, `CONTRADICTING`, `UNAVAILABLE`) using the **existing heuristic logic**. (Do NOT tune thresholds).
5.  Implement nearest-hour timestamp snapping for API arrays.
6.  Handle `None`/`null` API returns gracefully by converting to `UNAVAILABLE` evidence, avoiding system failure for coastal patches.
