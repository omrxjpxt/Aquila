# Phase 17: Firebase Cloud Application Backbone

## Overview
Phase 17 successfully transitions AQUILA from a durable local application (Phase 16D) to a cloud-native architecture using Firebase, while maintaining the exact same scientific processing pipeline.

This architecture enables:
- **Cloud Persistence**: Using Firestore to persist Jobs, Monitoring Zones, Investigations, and Scene Events.
- **Artifact Storage**: Using Cloud Storage for persisting large scientific artifacts (e.g. processed Rasters, detection GeoJSONs).
- **Authentication**: Firebase Authentication allows secure login for frontend users, verifying backend calls with Firebase ID Tokens.
- **Authorization**: Row-level security powered by Firestore Security Rules and backend token verification ensuring data ownership via `owner_uid`.
- **Real-Time Client Updates**: The frontend automatically subscribes to Firestore snapshots for live state updates instead of relying heavily on polling.

## Architecture

### Repository Factory
To preserve local durability (SQLite) while supporting Cloud deployments (Firestore), AQUILA utilizes a Repository Factory.
`PERSISTENCE_BACKEND = "firestore" | "sqlite"` determines which backend is used at runtime.

### Firestore Security Rules
All Firestore collections are restricted based on ownership. Data is owned by the `owner_uid`, and operations evaluate `request.auth.uid == resource.data.owner_uid` to enforce strict isolation.

### Authoritative Worker
We resolved legacy discrepancies and established `app/worker.py` as the single authoritative MonitoringWorker. All orchestration jobs run through it, leveraging the durable state machine established in 16D, utilizing Firestore's transactional concurrency (or SQLite's idempotency) depending on the configuration.

## Migration
A migration script is provided (`scripts/migrate_sqlite_to_firestore.py`) to move all data from an existing local SQLite environment to the Firestore backend. It seamlessly iterates through Zones, Events, Jobs, and Investigations and maps them directly to Firestore collections.

## Local / Demo Mode
We strictly adhered to ensuring no silent fallbacks. If `PERSISTENCE_BACKEND` is explicitly set to `sqlite`, AQUILA operates offline. If the frontend environment lacks Firebase configuration variables, it explicitly badges the UI with a "LOCAL MOCK" indicator and falls back to demo datasets. If Firebase is active, a "FIREBASE LIVE" badge is shown and realtime Firestore event subscriptions are initialized.
