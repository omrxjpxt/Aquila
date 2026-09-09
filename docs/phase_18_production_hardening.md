# AQUILA Phase 18: Production Hardening

This document outlines the architectural changes made during Phase 18 to transition AQUILA from a durable local application (Phase 16) and cloud backbone (Phase 17) to a production-ready system.

## 1. Production Configuration (`app/core/config.py`)
- Extracted hardcoded settings into `pydantic-settings`.
- Added validation for external API keys and configurations.
- Defined `CORS_ALLOWED_ORIGINS` for explicit CORS configuration.

## 2. Worker Hardening (`app/worker.py`)
- Removed module-level instantiation of the Orchestrator and Repositories.
- Implemented dependency injection using the Factory pattern.
- Added graceful shutdown mechanisms using `asyncio.Event` to ensure long-running scientific jobs aren't brutally killed on SIGTERM.

## 3. Failure Classification & Retry Policies (`app/services/failure_policy.py`)
- Implemented `FailureClassification` (TRANSIENT vs. PERMANENT).
- Modified `app/services/orchestrator.py` to use bounded exponential backoff (`delay = 2^retry_count * 15`).
- Failed jobs safely release worker leases allowing retry without deadlock.

## 4. Security Hardening (`app/api/deps.py`, `firestore.rules`)
- Backend `enforce_ownership` ensures users cannot fetch resources they don't own by manipulating `owner_uid` via the FastAPI endpoints.
- Firestore Security Rules strictly enforce that `owner_uid` cannot be mutated on update.

## 5. Observability
- Added structured JSON logging configuration in `app/core/logging_config.py`.
- Emitted `structured_data` logs for key state transitions (e.g., `JOB_STATE_CHANGE`, `JOB_FAILED_TRANSIENT`) to enable Log Analytics integration in production.

## 6. Health & Readiness (`app/main.py`)
- Placed `/health` (liveness) and `/readiness` (dependency verification) out of authenticated scope.
- Readiness checks CDSE configuration, look-alike models, and Firebase initialization.

## Next Steps
- Production Firebase initialization with real keys (to be done securely out-of-band).
- Verification of frontend state rendering.
