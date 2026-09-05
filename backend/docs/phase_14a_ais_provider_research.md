# Phase 14A AIS Provider Research

## 1. Requirement Definition
For AQUILA's forensic workflow, a suitable AIS data provider must support:
- **Historical Availability:** Vessel tracking data dating back to at least May 2024.
- **Historical Spatial/Bounding-Box Querying:** Ability to query an arbitrary bounding box over a historical time window.
- **Data Completeness:** Must include MMSI, timestamp, latitude, longitude, SOG, COG, and heading. Vessel identity (name, type, flag) is also required.
- **Global / Mediterranean Coverage:** Must cover European/Mediterranean waters (e.g., Corsica).

## 2. Provider Comparison Table

| Provider | Historical Availability | Historical Bounding-Box Query | Mediterranean Coverage | Free Tier / Trial | Suitability for AQUILA |
| --- | --- | --- | --- | --- | --- |
| **MarineTraffic (Kpler)** | Yes | No (requires data dumps or single-vessel queries) | Yes | No (Paid Enterprise) | LOW for direct spatial API, HIGH for data |
| **Spire Maritime (Kpler)** | Yes | No (legacy APIs discontinued) | Yes | No | LOW (REST API missing for this use case) |
| **Kpler / FleetMon** | Yes | Yes (Platform dependent) | Yes | No | LOW (Enterprise only) |
| **VesselAPI** | Yes | Yes | Yes | Yes (Limited) | MODERATE (good for dev, limited historical depth) |
| **NOAA MarineCadastre** | Yes | Yes | No (US Waters Only) | Yes (Free) | NONE (No Mediterranean coverage) |
| **BarentsWatch** | Yes | Yes | No (Norway Only) | Yes (Free) | NONE (No Mediterranean coverage) |
| **AISStream.io** | No (Real-time only) | N/A | Yes | Yes (Free) | NONE (No historical data) |

## 3. Historical Availability Findings
Most providers separate their "Live" and "Historical" data architectures. While APIs for real-time bounding box queries are common, APIs for *historical* bounding box queries are rare and typically reserved for expensive enterprise plans (via GraphQL or Snowflake data sharing) rather than simple REST APIs.

## 4. Corsica/Mediterranean Feasibility
The Corsica incident (May 26-27, 2024) occurred in the Mediterranean. Free open-data alternatives like NOAA (US) and BarentsWatch (Norway) do not cover this region. Commercial providers (Kpler, MarineTraffic, VesselAPI) do cover it, but accessing historical data via API requires a paid tier.

## 5. API/Authentication Requirements
Any integration would require an API Key passed via environment variables (e.g., `AIS_API_KEY`). A `Bearer` token or header authentication is standard.

## 6. Licensing and Demo-Use Considerations
Commercial providers strictly regulate data redistribution. Embedding raw historical AIS data in an open-source tool or public demo application may violate Terms of Service unless a specific academic or hackathon license is obtained.

## 7. Recommended Provider
**None.** There is no single provider that offers a free, global, historical bounding-box REST API suitable for a fully automated, unauthenticated public forensic pipeline. For an enterprise version of AQUILA, **Kpler / MarineTraffic** via bulk data export or custom GraphQL integration is the standard, but it is not viable for a zero-budget automated script.

## 8. Reasons Alternatives Were Rejected
- **AISStream.io:** No historical data.
- **NOAA / BarentsWatch:** No Mediterranean coverage.
- **MarineTraffic / Spire / Kpler:** Too expensive; legacy APIs discontinued; bounding box queries restricted on historical endpoints.

## 9. Current Feasibility Status
It is **NOT FEASIBLE** to implement a zero-cost, fully automated historical AIS bounding box query for the Corsica scenario using a public API.

## 10. Recommendation for Phase 14B
**Do NOT integrate a real commercial AIS API into production.** 
Phase 14B should focus on enhancing the `MockAISProvider` to ingest static, legally compliant, anonymized JSON datasets for demonstration purposes, or support a "bring-your-own-data" (BYOD) model where users upload their own CSV/JSON exports from MarineTraffic.
