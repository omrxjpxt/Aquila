from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import router as api_v1_router
from app.api.v1.satellite import router as satellite_router
from app.api.v1.analysis import router as analysis_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend scientific engine for maritime intelligence.",
    version="1.0.0"
)

# CORS configuration (allowing the frontend during development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    """
    return {"status": "ok"}

app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(satellite_router, prefix=settings.API_V1_STR)
app.include_router(analysis_router, prefix=settings.API_V1_STR)
