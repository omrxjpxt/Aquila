# AQUILA Phase 16A — GFW AIS + CDSE Automation Feasibility

This document summarizes the findings, architectural decisions, and feasibility conclusions for AQUILA Phase 16A, which focuses on transitioning the system toward automated continuous monitoring using Copernicus Data Space Ecosystem (CDSE) for satellite discovery and Global Fishing Watch (GFW) for vessel presence evidence.

## Part A: CDSE Automated Discovery

AQUILA's discovery architecture must transition from manual, user-initiated searches to automated continuous monitoring. 

### Key Decisions & Findings

1. **STAC Search for Manual Workflows**: 
   The current implementation using Sentinel Hub STAC search (`sh.dataspace.copernicus.eu/catalog/v1/search`) remains intact. It is optimized for on-demand, user-initiated investigations.

2. **OData for Catalogue Reconciliation**: 
   The CDSE OData catalogue (`catalogue.dataspace.copernicus.eu/odata/v1/Products`) is the primary mechanism for robust programmatic queries. It supports temporal filtering (`PublicationDate`), which allows AQUILA to checkpoint discovery progress safely.

3. **PULL Subscriptions as Primary Discovery Mechanism**:
   CDSE supports OData-based PULL subscriptions, allowing AQUILA to receive a queue of notifications when new products matching specific filters (e.g., Sentinel-1 GRD) are published. This is the **intended primary automated discovery mechanism**. It requires token-based authentication (personal user access token) which must be managed by the orchestration layer.

4. **Reconciliation as Safety Net**:
   Because subscriptions can experience queue overruns or downtime, OData reconciliation queries based on a `SceneDiscoveryCheckpoint` (tracking the last processed `PublicationDate` and `product UUIDs`) will run periodically to catch any missed products.

5. **Imagery Retrieval is Outside Discovery**:
   Discovery (identifying a `NewSceneEvent`) is strictly decoupled from imagery retrieval and scientific processing. The discovery service never downloads or processes rasters.

---

## Part B: Global Fishing Watch (GFW) AIS Integration

AQUILA relies on vessel data to identify candidate polluters. Previous phases demonstrated the high cost and unsuitability of traditional historical AIS providers for global, free automated monitoring. Phase 16A evaluated GFW's API suite as an alternative.

### Key Decisions & Findings

1. **GFW Presence is NOT Raw AIS Tracks**:
   > **CRITICAL**: The GFW `public-global-presence:latest` dataset (4Wings API) provides AIS-derived, aggregated data, typically yielding **approximately one position per hour per vessel**. This is NOT equivalent to raw, high-frequency continuous AIS tracking.

2. **Suitable for Candidate Filtering**:
   Despite the low temporal resolution, GFW presence data is sufficient to determine which vessels were in a monitoring Area of Interest (AOI) during the estimated release window. It serves as strong presence evidence.

3. **Insufficient for Precise Trajectory Reconstruction**:
   GFW data cannot be used to reconstruct sub-hourly precise vessel trajectories or to compute exact nearest-point-of-approach (CPA) to a spill origin with high fidelity.

4. **Augmenting Evidence with Vessel Events and Identity**:
   GFW's Events API provides critical behavioral context, such as AIS gaps (disabling events), loitering, and encounters. The Vessels API provides comprehensive metadata (IMO, MMSI, vessel type). These vastly improve the attribution evidence package.

5. **BYOD Remains Available**:
   Because GFW cannot supply high-resolution tracks, the `BYODAISProvider` (Bring Your Own Data) remains fully available. For detailed historical investigation requiring precise track geometry, a high-resolution commercial provider or BYOD is still required.

### Final Decision: GFW Augments, Does Not Replace

**GFW AUGMENTS the existing AIS architecture; it does not replace detailed AIS-track providers.**

The implemented architecture is:
```text
AISProvider
├── MockAISProvider          (Demonstration/Testing)
├── BYODAISProvider          (Detailed track reconstruction via manual upload)
└── GFWAISProvider           (Automated candidate filtering, identity, and behavioral events)
```

The `GFWAISProvider` explicitly refuses to implement `fetch_raw_positions()` to maintain scientific honesty, instead exposing `search_vessel_presence()`, `get_vessel_events()`, and `get_vessel_identities()`.

---

## Limitations and Phase 16B Recommendations

- **Authentication Lifecycle**: CDSE PULL subscriptions require active token refresh lifecycles, which must be implemented in the orchestration layer (Phase 16B).
- **GFW API Token**: The implementation supports `GFW_API_TOKEN` but currently falls back to mocked data for `search_vessel_presence` and `get_vessel_events` until actual reporting job logic is built.
- **Recommendations for 16B**: Proceed with Phase 16B orchestration. Build the continuous job runner (Celery/Redis) to actively poll the CDSE PULL subscription queue and run the 15-minute reconciliation fallback. Connect the `NewSceneEvent` to the existing `Slick` detection pipeline.
