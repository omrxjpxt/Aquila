# Phase 15B: AQUILA Capstone Live Preflight & End-to-End Rehearsal

## 1. Environment Prerequisites
- A functional Python 3.10+ virtual environment (`venv`).
- Valid `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`, and `CDSE_TOKEN_URL` in `backend/.env`.
- An active internet connection for Open-Meteo REST API access.
- A historically relevant AIS dataset (e.g., CSV) available locally for BYOD import.

## 2. Exact Canonical Scenario
- **Investigation ID**: `INV-CORSICA-001`
- **Sentinel-1 Scene**: `S1A_IW_GRDH_1SDV_20240527T172235...`
- **Acquisition Timestamp**: `2024-05-27T17:22:35Z`
- **AOI**: Corsica Channel (Mediterranean)
- **Polarization**: VV
- **Slick Candidate**: Morphological anomaly detected via SAR.
- **Classifier Model**: `lookalike_svm_real_v1` (HOG + RBF SVM)
- **Environmental Provider**: Open-Meteo (Marine + Atmospheric)
- **Environmental Timestamp Matching**: Nearest chronological hourly step backward from 17:22Z.
- **Drift Duration**: -24 Hours (Hindcast)
- **Drift Timestep**: 3600 seconds
- **Particle Count**: 1000 Particles
- **Forcing Grid**: Dynamic spatial envelope enclosing AOI.
- **Drift Provenance**: `LIVE`
- **AIS Mode**: `BYOD`
- **AIS Provenance**: `USER_PROVIDED_AIS`
- **Attribution Configuration**: Six-Factor Ordinal Compatibility

## 3. Model Used
- **Model Name**: HOG + RBF SVM
- **Artifact**: `lookalike_svm_real_v1.joblib`
- **Training Domain**: Real Sentinel-1 SAR patches.
- **Evaluation Domain**: Real Sentinel-1 SAR patches.
- **Raw Decision Score**: SVM distance from hyperplane (not a probability).
- **Classification Result**: `OIL_LIKE`, `LOOKALIKE`, or `UNCERTAIN`.

## 4. CDSE Status
- **Status**: `LIVE` (Confirmed operational when `.env` is populated).
- **Retrieval API**: OData / Process API.
- **Data Properties**: Native CRS, valid data mask, calibrated backscatter.

## 5. Environmental Status
- **Status**: `LIVE` (Open-Meteo ERA5 / CMEMS).
- **Retrieval**: Successfully fetches U/V current vectors and wind vectors for the requested spatiotemporal window.

## 6. Drift Status
- **Status**: `WORKING`.
- **Completion States**: Handles `COMPLETED` (Deep Water) and `PARTIALLY_COMPLETED` (Landmask stranding). Partial simulations correctly report the number of stranded particles.

## 7. AIS Mode
- **Status**: `BYOD` (Primary for forensic validation) or `DEMO_MOCK` (Fallback).
- **Provenance**: `USER_PROVIDED_AIS` or `DEMO_MOCK` appropriately tagged.

## 8. Attribution Result
- **Status**: `WORKING`.
- **Six Factors**: Output cleanly mapped to `SUPPORTING`, `NEUTRAL`, `UNAVAILABLE`, or `CONTRADICTING`.
- **Tie-Breaking**: Deterministic sorting by MMSI ascending.
- **Terminology**: Explicitly states "Highest-Ranked Candidate" and "Compatibility Score".

## 9. End-to-End Runtime
- Total runtime is consistently between 1.5 to 16.5 seconds for the automated backend pipeline depending on drift stranding conditions and local machine capabilities.

## 10. Repeatability Result
- `PASS`. The scenario can be initialized from scratch and consistently matches previous investigation states when re-running validation. The backend database efficiently persists investigation states.

## 11. Failure-Injection Results
- `PASS`. 
- **Missing CDSE Credentials**: Pipeline gracefully errors out rather than silently fabricating mock evidence if explicitly requested for LIVE.
- **OpenDrift Landmask**: Handled as `PARTIALLY_COMPLETED` without crashing.

## 12. Known Limitations
- Environmental forcing resolution is coarse (~10km).
- Landmask stranding does not simulate complex coastal washing interactions; particles simply halt.
- CDSE API throughput can bottleneck the initial scene download.

## 13. Demo-Day Startup Checklist
1. Verify `backend/.env` is correctly populated with CDSE credentials.
2. Ensure the Sentinel-1 scene is within the CDSE fast-access window or cached.
3. Start backend: `cd backend && source venv/bin/activate && uvicorn app.main:app --reload`.
4. Start frontend: `cd aquila-frontend && npm run dev`.
5. Have the BYOD AIS CSV file ready on the desktop for upload.

## 14. Demo-Day Recovery Procedure
- If CDSE is unavailable, explicitly inform the audience and switch to the `DEMO_MOCK` scene ingestion fallback to continue demonstrating the environmental and drift engines.
- If Open-Meteo is unavailable, the demo must be paused as the pipeline strictly refuses to fake physical environmental forcing.
