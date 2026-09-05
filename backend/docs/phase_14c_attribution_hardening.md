# Phase 14C: Evidence-Driven Vessel Attribution Hardening

## 1. Goal
Harden the existing six-factor attribution engine (`AttributionService`) so that it accurately processes standardized upstream AIS inputs (Mock and BYOD) along with environmental drift models. The update enforces strict semantic separation between `NEUTRAL` and `UNAVAILABLE`, strictly abides by the ordinal scoring model (+2/0/0/-2), and removes any implicit judgments of "guilt" related to AIS gaps or ordinary behavior.

## 2. Six-Factor Attribution Model

The system evaluates candidates against six physical and behavioral factors. The output is a **Compatibility Ranking**, explicitly NOT a probability or causal proof of responsibility.

### Factor 1: Spatial Compatibility
- **SUPPORTING (+2)**: Vessel track physically intersects the inferred origin region.
- **NEUTRAL (0)**: Vessel track passes near the region (within proximity bounds).
- **CONTRADICTING (-2)**: Vessel track does not pass near the origin region.

### Factor 2: Temporal Compatibility
- **SUPPORTING (+2)**: Vessel was present during the inferred release window.
- **CONTRADICTING (-2)**: Vessel was absent during the inferred release window.

### Factor 3: Trajectory Compatibility
- **UNAVAILABLE (0)**: Standard maneuvers observed; insufficient granular evidence to determine any anomaly. Ordinary movement does not preclude illicit activity.

### Factor 4: Drift Compatibility
Drift compatibility explicitly inspects the provenance of the environmental drift reconstruction.
- **SUPPORTING (+2)**: LIVE drift model used, and vessel position aligns with the backward drift footprint.
- **CONTRADICTING (-2)**: LIVE drift model used, and vessel position explicitly contradicts the footprint.
- **UNAVAILABLE (0)**: `DEMO_MOCK` drift model used (which is algorithmic demonstration, not forensic evidence), or insufficient overlap between vessel track and LIVE drift footprint. Absence of drift intersection is not strictly contradictory due to physical uncertainties (e.g. landmask stranding).

### Factor 5: Behavioural Evidence
- **UNAVAILABLE (0)**: Insufficient historical baseline prevents anomaly detection. Speed changes or gaps do not imply suspicious behavior.

### Factor 6: AIS Data Quality
- **SUPPORTING (+2)**: High-density AIS observations with a complete evidentiary record (no significant gaps).
- **UNAVAILABLE (0)**: AIS gap observed; evidentiary record is incomplete. Missing evidence is never penalized as CONTRADICTING because an AIS gap is not definitive proof of suspicious behavior.

## 3. Tie Handling
In the event of an identical score, candidates retain a tied rank. For API/UI stability, candidates are deterministically ordered secondarily by MMSI (ascending). This is strictly a presentation ordering and is not described as evidentiary superiority.

## 4. Evidence Coverage
Evidence Coverage is tracked independently of the Compatibility Score. It indicates how many of the six factors contained usable evidentiary information (i.e. `SUPPORTING`, `NEUTRAL`, or `CONTRADICTING` vs `UNAVAILABLE`). The score is the sum of factor contributions; Evidence Coverage provides context to the robustness of that score.

## 5. Provider Independence and Provenance
The attribution logic is entirely decoupled from the upstream AIS source. It transparently consumes generalized `AISTrack` structures provided by either `MockAISProvider` or `BYODAISProvider`. Provenance (e.g., `DEMO_MOCK`, `USER_PROVIDED_AIS`, `LIVE`) is strictly propagated through the result to ensure evidentiary transparency.

## 6. Scientific Interpretation & Limitations
The generated score is an ordinal compatibility heuristic designed to triage and prioritize vessel candidates for human investigators.
- It is **not** a calibrated statistical likelihood.
- It is **not** a probability of guilt.
- It is **not** proof of responsibility.
The UI and API explicitly define this as a "Compatibility ranking, not proof of responsibility."
