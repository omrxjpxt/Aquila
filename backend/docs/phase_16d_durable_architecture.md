# AQUILA Phase 16D: Durable Autonomous Monitoring & Persistence

## Overview

Phase 16D transitioned the AQUILA scientific orchestration engine from an ephemeral, in-memory state machine to a durable, restart-safe, and concurrent-ready background system. This was achieved using SQLite in WAL mode without introducing distributed infrastructure (like Celery or Redis) prematurely.

The objective was strictly to wrap the existing, verified Phase 16C integration pipeline in a durability layer. The scientific flow (CDSE -> Sentinel-1 -> Detection -> Classification -> Investigation -> Open-Meteo -> OpenDrift -> GFW -> Attribution) remains completely intact.

## Architecture & Components

### 1. Persistence Layer (`app/services/repositories/db.py`)
- SQLite database configured with `PRAGMA journal_mode = WAL` and `PRAGMA busy_timeout = 30000` to handle single-node concurrent access.
- Five core tables introduced:
  1. `monitoring_zones`: Persistent storage of active discovery zones.
  2. `scene_events`: Persisted initial payloads from CDSE to avoid data loss.
  3. `monitoring_jobs`: The orchestrator state machine. Stores idempotency keys, current status, retry counts, leases, and artifacts.
  4. `investigations`: Durable storage of triggered events/anomalies.
  5. `evidence`: Append-only immutable scientific evidence events.

### 2. Idempotency & Deduplication
- **MonitoringJobs**: Uses a composite `idempotency_key` (`product_id_zone_id`). Prevents duplicate job creation when a CDSE reconciliation discovers the same scene multiple times.
- **Investigations**: Employs a composite UNIQUE constraint (`source_product_id`, `monitoring_zone_id`, `anomaly_id`) to deduplicate event creation within the same scene.

### 3. Worker Claiming & Leases
- To support background daemon concurrency, jobs are claimed atomically using SQLite constraints.
- `worker_id`, `claimed_at`, and `lease_until` are updated when a job is claimed.
- Jobs with expired leases (due to crash or eviction) are automatically recovered by `recover_stale_jobs()` and rolled back to `RETRY_WAIT`.

### 4. Stage-Aware Crash Recovery
- Scientific artifacts (like large satellite rasters) are tracked in `ArtifactStore` (local disk for Phase 16D).
- If the system crashes during processing, `orchestrator.py` verifies the existence of generated artifacts in the `artifact_references` on disk before re-downloading or re-processing. This prevents wasting CDSE quota or GPU time.

### 5. Background Polling Daemon (`app/worker.py`)
- Introduces `MonitoringWorker`, an `asyncio` daemon that performs:
  1. OData discovery against `SqliteMonitoringZoneRepository` zones.
  2. Submits new events to `Orchestrator.ingest_scene_event()`.
  3. Polls `SqliteJobRepository` for `QUEUED` / `RETRY_WAIT` jobs.
  4. Atomically claims jobs via leases and drives them through the state machine.

## Rehearsal Verifications

Three mandatory rehearsals were executed to verify system behavior:

1. **Restart Rehearsal:**
   - A worker claimed a job and transitioned to `PROCESSING`. The lease was artificially expired to simulate a hard crash.
   - A second worker instance was booted, invoked `recover_stale_jobs()`, found the abandoned job, transitioned it safely to `RETRY_WAIT`, and reclaimed it.
   - **Status: PASSED.**

2. **Concurrency Rehearsal:**
   - 10 duplicate `NewSceneEvent` objects were injected simultaneously. The idempotency key properly suppressed 9, resulting in 1 `QUEUED` job.
   - 3 background tasks attempted to concurrently `claim_job()` on the single job. Only exactly 1 worker obtained the lease.
   - **Status: PASSED.**

3. **Live Continuous Monitoring Rehearsal:**
   - Simulated the `MonitoringWorker` daemon reading from enabled `MonitoringZone` records.
   - Polled CDSE via `CDSEDiscoveryService` and verified successful OData API call and reconciliation payload generation.
   - **Status: PASSED.**

## Next Steps
The system is now durable and ready for:
1. Long-running field tests processing hundreds of scenes.
2. Introduction of real frontend interfaces to review generated investigations.
3. Containerization and cloud deployment (e.g., swapping `LocalArtifactStore` for GCS/S3).
