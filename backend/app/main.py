from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.api.v1.router import router as api_v1_router
from app.core.worker import worker
from app.core.firebase_admin import initialize_firebase_admin
from app.services.repositories.db import initialize_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    initialize_db()
    initialize_firebase_admin()
    worker.start()
    yield
    # Shutdown
    await worker.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend scientific engine for maritime intelligence.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """
    Basic health check endpoint. Liveness only.
    """
    return {"status": "ok"}

@app.get("/readiness")
async def readiness_check():
    """
    Readiness check evaluating dependency configuration.
    """
    from app.core.config import settings
    import os
    
    status = {
        "ready": True,
        "cdse": "configured" if settings.CDSE_CLIENT_ID else "unavailable",
        "firebase": "unavailable",
        "model": "present" if os.path.exists(settings.LOOKALIKE_MODEL_PATH) else "missing",
        "worker": "running" if worker._task and not worker._task.done() else "unavailable"
    }
    
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.core.firebase_admin import _firebase_initialized
        status["firebase"] = "initialized" if _firebase_initialized else "configured (not initialized)"
        if not _firebase_initialized:
            status["ready"] = False
    else:
        status["firebase"] = "not requested (sqlite mode)"
        
    if not status["ready"]:
        from fastapi import Response
        return Response(content=str(status), status_code=503)
        
    return status

@app.get("/api/v1/status")
async def get_status():
    from app.core.config import settings
    import os
    
    cdse_status = "CONFIGURED" if settings.CDSE_CLIENT_ID else "UNAVAILABLE"
    
    if settings.PERSISTENCE_BACKEND == "firestore":
        from app.core.firebase_admin import _firebase_initialized
        firebase_status = "CONNECTED" if _firebase_initialized else "ERROR"
    else:
        firebase_status = "UNAVAILABLE"
        
    gfw_status = "CONFIGURED" if settings.GFW_API_TOKEN else "UNAVAILABLE"
    
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "persistence": settings.PERSISTENCE_BACKEND,
        "providers": {
            "cdse": cdse_status,
            "firebase": firebase_status,
            "gfw": gfw_status,
            "open_meteo": "CONNECTED",
            "opendrift": "CONFIGURED",
            "ml_model": "LOADED" if os.path.exists(settings.LOOKALIKE_MODEL_PATH) else "MISSING"
        }
    }

app.include_router(api_v1_router, prefix=settings.API_V1_STR)
