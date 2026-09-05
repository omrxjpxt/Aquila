# Phase 14B: Bring-Your-Own-Data (BYOD) Historical AIS Integration

## 1. Architecture
AQUILA implements a pluggable `AISProvider` architecture. Because historical, region-bound REST APIs are commercially gated and not freely available for automated polling in production, we provide `BYODAISProvider`.
- **BYODAISProvider**: Ingests user-supplied CSV/JSON exports (e.g. from MarineTraffic, Kpler, or VesselAPI), normalizes the data, and stores it locally per investigation.
- **MockAISProvider**: Provides synthetic fallback tracks.
- **RealAISProvider**: (Future/Phase 14A prototype) Reserved for enterprise API keys.

## 2. Supported Input Formats
- **CSV**: Comma-separated values.
- **JSON**: Array of objects, or an object containing a `data` array.

## 3. Schema & Normalization
The following fields are extracted. AQUILA supports common aliases (e.g., `lat` → `latitude`, `time` → `timestamp`, `sog` → `speed_knots`, `cog` → `heading`).

**Minimum Required Fields**:
- `mmsi`: 9-digit string.
- `timestamp`: ISO-8601 string. Normalized to UTC.
- `latitude`: Float between -90 and 90.
- `longitude`: Float between -180 and 180.

**Optional Fields**:
- `speed_knots` (or `speed`, `sog`)
- `heading` (or `cog`)
- `vessel_name` (or `name`)
- `imo`
- `vessel_type` (or `type`, `ship_type`)
- `flag`

## 4. Validation Rules
- **Structural**: Rows missing `mmsi`, `latitude`, `longitude`, or `timestamp` are rejected.
- **Format**: Invalid MMSIs (not exactly 9 digits), out-of-bounds coordinates, or unparseable timestamps generate validation errors.
- **Errors/Warnings**: Summarized in the API response. Up to 50 errors/warnings are returned. Invalid rows are skipped; valid rows are retained.

## 5. Duplicate & Gap Handling
- **Duplicates**: Multiple rows with the exact same `mmsi` and `timestamp` are deduplicated deterministically (the first parsed row is kept).
- **Sorting**: Records are chronologically sorted to ensure correct track construction.
- **Gaps**: Missing data is strictly preserved as gaps (represented by `AISGap` objects in the candidate track). AQUILA **never** interpolates missing AIS positions, as gaps are critical forensic evidence of potential spoofing/disabling.

## 6. Provenance Model
- **`provenance_mode`**: Hardcoded to `USER_PROVIDED_AIS`. The system never labels uploaded data as `LIVE`.
- **`declared_source`**: If the investigator specifies the origin (e.g., "MarineTraffic"), it is recorded as `declared_source`. AQUILA explicitly states this is an investigator declaration, not an independent validation of authenticity.

## 7. API
**`POST /api/v1/ais/upload`**
Accepts `investigation_id` (Form), `declared_source` (Form, optional), and `file` (UploadFile).
Returns a summary containing record counts, vessel counts, time coverage, validation status, and errors/warnings.

**`POST /api/v1/ais/candidates`**
Updated to accept `mode` (`MOCK` or `BYOD`).
- If `mode="BYOD"`, AQUILA reads the previously uploaded dataset. If none exists, it returns a 400 error.
- Never silently falls back to `MOCK` if `BYOD` fails.

## 8. Frontend Workflow
In the Investigation UI (e.g., Drift Reconstruction / Candidate Analysis):
1. Investigator uploads a CSV/JSON file.
2. The UI displays the import summary (coverage window, vessel count, errors).
3. The investigator clicks "Discover Candidates", sending `mode="BYOD"` to the backend.
4. Candidates are rendered with a "USER PROVIDED" provenance badge.

## 9. Storage & Security
- **Local Persistence**: For the prototype/hackathon scope, datasets are stored in `backend/data/ais_imports/<investigation_id>_ais.json`.
- **.gitignore**: The `data/ais_imports/` directory is ignored to prevent accidental commits of proprietary data.
- **No API Keys**: No external API keys are required or logged for BYOD.
- **File Validation**: The upload endpoint strictly checks for `.csv` and `.json` extensions and parses content defensively.

## 10. Limitations
- **Memory**: The current prototype loads the entire uploaded dataset into memory during import. Extremely large datasets (e.g., gigabytes) may cause OOM errors.
- **Database**: Does not use a relational database for spatial indexing.
- **Future Integration**: The `AISProvider` interface ensures that when an enterprise API key is procured, a `RealAISProvider` can be swapped in without altering the `AISService` tracking logic.
