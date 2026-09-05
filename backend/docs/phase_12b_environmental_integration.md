# Phase 12B — Real Environmental Integration

## 1. Architecture
The environmental integration shifts AQUILA from relying entirely on a static mock provider to a flexible provider architecture capable of retrieving real historical metocean data from external APIs via REST.

A configuration toggle (`ENVIRONMENTAL_PROVIDER`) dictates the instantiated service inside `backend/app/api/v1/analysis.py`.
- `DEMO_MOCK`: `MockEnvironmentalDataService`
- `LIVE_OPEN_METEO`: `OpenMeteoEnvironmentalService`

## 2. Provider
**Open-Meteo** was selected due to its scientific credibility (wrapping Copernicus Marine and ECMWF ERA5), lack of authentication constraints, and lightning-fast synchronous REST capability.

## 3. API Endpoints
*   **Wind**: `https://archive-api.open-meteo.com/v1/archive`
*   **Currents**: `https://marine-api.open-meteo.com/v1/marine`

## 4. Variables & 5. Units
*   `wind_speed_10m` (converted from km/h to **m/s**)
*   `wind_direction_10m` (meteorological convention, coming from: **degrees**)
*   `ocean_current_velocity` (converted from km/h to **m/s**)
*   `ocean_current_direction` (oceanographic convention, going to: **degrees**)

## 6. Time Matching
The Sentinel-1 scene timestamp acts as the authoritative target time. The system downloads the hourly API array for that entire day and programmatically locates the observation with the minimum absolute time difference. 
If the nearest observation differs by more than **90 minutes**, the system rejects the data and marks it `UNAVAILABLE`.

## 7. Spatial Matching
The API utilizes the exact candidate coordinates. The returned exact grid node coordinates (`returned_lat`, `returned_lon`) are explicitly preserved to document the spatial disparity.

## 8. Provenance
`EnvironmentalObservation` now enforces the preservation of:
*   `provider`: String identifier (Open-Meteo)
*   `dataset`: The underlying dataset (ECMWF ERA5 or CMEMS)
*   `requested_lat`/`requested_lon` vs `returned_lat`/`returned_lon`
*   `requested_timestamp` vs `timestamp` and `time_offset_hours`
*   `api_endpoint` and `retrieval_timestamp`

## 9. Error Handling & 10. UNAVAILABLE Semantics
A missing observation (e.g., coastal marine boundaries returning `null`), network timeout, or HTTP 4xx/5xx failure gracefully falls back to an observation with `availability_status = "UNAVAILABLE"`. 
The quantitative fields (`speed_m_s`, `direction_deg`) are strictly set to `None`, ensuring fake `0.0` values are never fused as real observations.

## 11. Mock Compatibility
The existing `MockEnvironmentalDataService` and default `config.ENVIRONMENTAL_PROVIDER="DEMO_MOCK"` were maintained. 

## 12. Test Results
`tests/test_phase_12b.py` ensures:
*   Time matching resolves to the nearest hour.
*   Discrepancies > 90 minutes correctly return `UNAVAILABLE`.
*   Coastal arrays containing `null` properly fall back to `UNAVAILABLE` rather than crashing.
*   Unit conversion is exactly `(1000/3600)`.
*   Network errors are suppressed into `UNAVAILABLE` status without terminating the investigation.

## 13. Live Corsica Validation
Validating the `2024-05-27 17:22:35Z` target scene at `[42.25, 9.5]` produced the following exact results:

**WIND**
*   **Speed**: 1.50 m/s
*   **Direction**: 188.0°
*   **Offset**: -0.38 hours (17:00:00Z)
*   **Dataset**: ECMWF ERA5

**CURRENT**
*   **Speed**: 0.11 m/s
*   **Direction**: 27.0°
*   **Offset**: -0.38 hours (17:00:00Z)
*   **Dataset**: CMEMS Global Ocean Physics

## 14. Scientific Limitations
*   Model-derived environmental forcing is NOT an in-situ observation.
*   Spatial resolution is finite (25km for Wind, 9km for Currents) meaning sub-grid scale variations are unrepresented.
*   Coastal current accuracy is strictly limited.
*   The actual evidence-fusion rules within AQUILA remain prototype heuristics. True evidence-fusion requires extensive physical parameterization.
