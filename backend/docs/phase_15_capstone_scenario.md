# Phase 15A: AQUILA Final Capstone Scenario Freeze

## 1. SIH Requirement-to-AQUILA Coverage Matrix

| SIH Requirement | AQUILA Implementation | Validation Evidence | Status | Limitation |
| :--- | :--- | :--- | :--- | :--- |
| **SAR Data Ingestion** | Automated CDSE client integration via OData. | `cdse_client.py`, `live_cdse_validation_11f.py` | LIVE | Requires valid CDSE API credentials; throughput limited by EU Copernicus limits. |
| **Slick Detection** | Morphological thresholding and geometry extraction. | `slick_detection.py`, test suite | LIVE | Relies on baseline SAR parameters; performs poorly in high wind (>10 m/s). |
| **Look-Alike Classification** | HOG + RBF SVM model trained on domain-specific real SAR patches. | `classification_service.py`, `train_phase_11e.py` | LIVE | Does not guarantee physical substance; explicitly trained to separate 'Oil-Like' from biological look-alikes. |
| **Environmental Forcing** | Real-time / Historical API integration fetching U/V components. | `OpenMeteoForcingAdapter` | LIVE | Spatial resolution is ~10km (Open-Meteo). Not localized hydrodynamic modeling. |
| **Drift Reconstruction** | OceanDrift 1.14.12 executing backward particle transport. | `opendrift_adapter.py`, `DriftService` | LIVE | Trajectories are probabilistic; landmask stranding stops particle tracking. |
| **Vessel Attribution** | Six-factor compatibility ranking ingesting AIS data. | `AttributionService`, `AISService` | BYOD / MOCK | Live regional historical AIS REST access is gated; BYOD enables robust forensic investigation. |

## 2. Canonical Demo Scenario

This scenario represents the most heavily validated and robust pathway through the AQUILA engine, specifically targeting the documented **Corsica Scenario**.

- **Investigation ID**: `INV-CORSICA-001`
- **Sentinel-1 Scene**: `S1A_IW_GRDH_1SDV_20240527T053422...`
- **Acquisition Timestamp**: `2024-05-27T05:34:22Z`
- **AOI**: Corsica Channel (Mediterranean)
- **Polarization**: VV (Primary for slick detection)
- **Slick Candidate**: High-contrast morphological anomaly (Area: ~15km²)
- **Classifier Model**: `AQUILA_SVM_v1.0` (HOG + RBF SVM trained on 400 Sentinel-1 patches)
- **Environmental Provider**: Open-Meteo (Marine + Atmospheric)
- **Environmental Timestamp Matching**: Nearest chronological hourly step backward from 05:34Z.
- **Drift Duration**: -24 Hours (Hindcast)
- **Drift Timestep**: 3600 seconds
- **Particle Count**: 1000 Particles
- **Forcing Grid**: Dynamic spatial envelope enclosing AOI + 2 degree buffer.
- **Drift Provenance**: `LIVE` (OceanDrift engine)
- **AIS Mode**: `BYOD`
- **AIS Dataset/Provenance**: Investigator uploaded historical Mediterranean CSV (`USER_PROVIDED_AIS`)
- **Attribution Configuration**: Six-Factor Ordinal Compatibility (Spatial, Temporal, Trajectory, Drift, Behavioural, AIS Quality)

## 3. Provenance Map

For absolute forensic transparency, the system explicitly logs the provenance of all data sources used during the scenario:

- **Satellite Scene Ingestion**: `LIVE` (or `DEMO_MOCK` if CDSE API is unavailable).
- **Slick Extraction**: `LIVE` (Computed deterministically on local hardware).
- **Patch Classification**: `LIVE` (Model evaluation running locally).
- **Environmental Data**: `LIVE` (Fetched from Open-Meteo REST API).
- **Drift Simulation**: `LIVE` (OceanDrift executing on dynamic forcing fields).
- **AIS Tracking**: `USER_PROVIDED_AIS` (Ingested via BYOD integration).
- **Attribution Ranking**: `LIVE` (Calculated deterministically via six-factor engine).

## 4. Scientific Claims

### Legitimate Claims (What AQUILA demonstrates)
- Automated end-to-end chaining of SAR extraction, environmental forcing, and hydrodynamic drift.
- Transparent separation of slick footprints from biological look-alikes using trained ML.
- Deterministic backward trajectory mapping of a detected slick footprint.
- Robust triaging of candidate vessels based on spatiotemporal and environmental compatibility.
- Preservation of forensic integrity by flagging missing evidence (AIS Gaps) rather than penalizing.

### Prohibited Claims (What AQUILA does NOT claim)
- AQUILA does **not** identify a "confirmed spill source" or "perpetrator."
- AQUILA does **not** calculate the "probability of guilt."
- AQUILA does **not** provide "validated causal attribution" in a legal context.
- AQUILA does **not** claim its drift model perfectly replicates micro-hydrodynamics.

## 5. Demo Success Criteria

The SIH demo is considered successful if it passes the following sequence without unhandled exceptions:
1. **Investigation Creation**: The UI successfully initializes `INV-CORSICA-001`.
2. **Satellite Retrieval**: Scene metadata and boundaries are mapped.
3. **Candidate Generation**: The Slick is isolated and its polygon rendered.
4. **Classifier Result**: The ML model assigns a class (e.g., `OIL_LIKE`).
5. **Environmental Evidence**: Wind (10m) and Current vectors are verified as downloaded.
6. **Drift Completion**: OceanDrift successfully retro-propagates 1000 particles to generate an `OriginEstimate` polygon.
7. **AIS Ingestion**: The investigator successfully uploads a BYOD CSV/JSON dataset.
8. **Candidate Tracks**: Relevant vessels are extracted via `AISService` spatial bounds filtering.
9. **Attribution**: The six-factor engine successfully outputs a ranked list of vessels without crashing on ties or gaps.
10. **Provenance**: The UI correctly displays `LIVE`, `USER_PROVIDED_AIS`, and "Compatibility ranking, not proof of responsibility."

## 6. Failure Plan

If an external service is unavailable during the live SIH demonstration, the following fallback procedures apply to maintain system operation without silently faking data:
- **CDSE Unavailable**: The system explicitly catches the failure and falls back to a locally cached Sentinel-1 scene, updating the provenance to `DEMO_MOCK`.
- **Open-Meteo Unavailable**: Environmental service returns failure; drift engine is halted; error is shown to investigator.
- **OpenDrift Fails**: If particle tracking fails (e.g., landmask overlap), partial simulation geometries are logged; attribution drift factor defaults to `UNAVAILABLE`.
- **AIS BYOD Missing/Malformed**: File upload returns validation HTTP 400 errors with strict typing feedback (e.g., "Missing longitude"). 
- **No Candidate Slick**: Scene evaluation ends early; investigation status updates to `CLEAN`.
- **Classifier Returns UNCERTAIN**: Drift pipeline continues, but the report explicitly highlights low confidence in the physical substance.
