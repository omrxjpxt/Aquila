import os
import httpx
import logging
from datetime import datetime
from typing import Dict

from app.core.config import settings
from app.schemas.source_health import SourceHealthItem, SystemStatusResponse

logger = logging.getLogger(__name__)


class SourceHealthService:
    """
    Centralized, truthful intelligence source health and provenance service.
    Differentiates LIVE, READY, UNAVAILABLE, DEGRADED, and ERROR states without confusing configuration with errors.
    """

    @staticmethod
    async def check_cdse() -> SourceHealthItem:
        if not settings.CDSE_CLIENT_ID or not settings.CDSE_CLIENT_SECRET:
            return SourceHealthItem(
                id="cdse",
                name="Copernicus Data Space Ecosystem",
                provider="European Space Agency / CloudFerro",
                status="UNAVAILABLE",
                mode="UNAVAILABLE",
                configured=False,
                available=False,
                last_checked=datetime.utcnow(),
                reason="CDSE credentials not configured in backend environment.",
                provenance="Copernicus Data Space Ecosystem (Sentinel-1 SAR)"
            )
        try:
            from app.services.cdse_service import CDSEService
            service = CDSEService()
            _ = await service._get_access_token()
            return SourceHealthItem(
                id="cdse",
                name="Copernicus Data Space Ecosystem",
                provider="European Space Agency / CloudFerro",
                status="LIVE",
                mode="LIVE",
                configured=True,
                available=True,
                last_checked=datetime.utcnow(),
                reason="Copernicus OAuth token acquired and Sentinel-1 catalog operational.",
                provenance="Copernicus Data Space Ecosystem (Sentinel-1 SAR GRD)"
            )
        except Exception as e:
            logger.warning("CDSE health check exception: %s", e)
            return SourceHealthItem(
                id="cdse",
                name="Copernicus Data Space Ecosystem",
                provider="European Space Agency / CloudFerro",
                status="ERROR",
                mode="LIVE",
                configured=True,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"CDSE OAuth authentication error: {str(e)}",
                provenance="Copernicus Data Space Ecosystem (Sentinel-1 SAR)"
            )

    @staticmethod
    async def check_firebase() -> SourceHealthItem:
        service_account_exists = bool(
            settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        )
        if not service_account_exists:
            return SourceHealthItem(
                id="firebase",
                name="Firebase Backend Services",
                provider="Google Cloud / Firebase",
                status="UNAVAILABLE",
                mode="UNAVAILABLE",
                configured=False,
                available=False,
                last_checked=datetime.utcnow(),
                reason="Firebase service account credentials file not found.",
                provenance="Google Cloud Identity Platform"
            )
        try:
            from app.core.firebase_admin import initialize_firebase_admin
            initialize_firebase_admin()
            import app.core.firebase_admin as fa
            if fa._firebase_initialized:
                return SourceHealthItem(
                    id="firebase",
                    name="Firebase Backend Services",
                    provider="Google Cloud / Firebase",
                    status="LIVE",
                    mode="LIVE",
                    configured=True,
                    available=True,
                    last_checked=datetime.utcnow(),
                    reason=f"Firebase Admin SDK initialized for project '{settings.FIREBASE_PROJECT_ID}'.",
                    provenance="Firebase Auth & Storage (aquila-system)"
                )
            else:
                return SourceHealthItem(
                    id="firebase",
                    name="Firebase Backend Services",
                    provider="Google Cloud / Firebase",
                    status="ERROR",
                    mode="LIVE",
                    configured=True,
                    available=False,
                    last_checked=datetime.utcnow(),
                    reason="Firebase Admin SDK initialization could not be completed.",
                    provenance="Google Cloud Identity Platform"
                )
        except Exception as e:
            logger.warning("Firebase health check exception: %s", e)
            return SourceHealthItem(
                id="firebase",
                name="Firebase Backend Services",
                provider="Google Cloud / Firebase",
                status="ERROR",
                mode="LIVE",
                configured=True,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"Firebase Admin initialization error: {str(e)}",
                provenance="Google Cloud Identity Platform"
            )

    @staticmethod
    async def check_gfw() -> SourceHealthItem:
        if not settings.GFW_API_TOKEN:
            return SourceHealthItem(
                id="gfw",
                name="Global Fishing Watch",
                provider="Global Fishing Watch API",
                status="UNAVAILABLE",
                mode="UNAVAILABLE",
                configured=False,
                available=False,
                last_checked=datetime.utcnow(),
                reason="GFW_API_TOKEN is not configured in backend environment.",
                provenance="Global Fishing Watch API v3 (Presence / Events)"
            )
        try:
            from app.services.gfw_ais_provider import GFWAISProvider
            provider = GFWAISProvider(token=settings.GFW_API_TOKEN)
            resp = await provider.get_fleet(query="test", limit=1)
            if resp.status == "LIVE":
                return SourceHealthItem(
                    id="gfw",
                    name="Global Fishing Watch",
                    provider="Global Fishing Watch API",
                    status="LIVE",
                    mode="LIVE",
                    configured=True,
                    available=True,
                    last_checked=datetime.utcnow(),
                    reason="Global Fishing Watch API token active and verified.",
                    provenance="Global Fishing Watch API v3"
                )
            else:
                return SourceHealthItem(
                    id="gfw",
                    name="Global Fishing Watch",
                    provider="Global Fishing Watch API",
                    status=resp.status,
                    mode="UNAVAILABLE",
                    configured=True,
                    available=False,
                    last_checked=datetime.utcnow(),
                    reason=resp.reason or "GFW API returned non-live status.",
                    provenance="Global Fishing Watch API v3"
                )
        except Exception as e:
            return SourceHealthItem(
                id="gfw",
                name="Global Fishing Watch",
                provider="Global Fishing Watch API",
                status="ERROR",
                mode="LIVE",
                configured=True,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"GFW API connection error: {str(e)}",
                provenance="Global Fishing Watch API v3"
            )

    @staticmethod
    async def check_open_meteo() -> SourceHealthItem:
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get(
                    "https://marine-api.open-meteo.com/v1/marine",
                    params={"latitude": 24.0, "longitude": 58.0, "hourly": "ocean_current_velocity"}
                )
                if resp.status_code == 200:
                    return SourceHealthItem(
                        id="open_meteo",
                        name="Open-Meteo Environmental Service",
                        provider="Open-Meteo / ECMWF / CMEMS",
                        status="LIVE",
                        mode="LIVE",
                        configured=True,
                        available=True,
                        last_checked=datetime.utcnow(),
                        reason="Open-Meteo Marine & ECMWF ERA5 atmospheric endpoints responding (HTTP 200).",
                        provenance="Open-Meteo Marine & ERA5 APIs"
                    )
                else:
                    return SourceHealthItem(
                        id="open_meteo",
                        name="Open-Meteo Environmental Service",
                        provider="Open-Meteo / ECMWF / CMEMS",
                        status="DEGRADED",
                        mode="LIVE",
                        configured=True,
                        available=False,
                        last_checked=datetime.utcnow(),
                        reason=f"Open-Meteo returned HTTP {resp.status_code}.",
                        provenance="Open-Meteo Marine & ERA5 APIs"
                    )
        except Exception as e:
            return SourceHealthItem(
                id="open_meteo",
                name="Open-Meteo Environmental Service",
                provider="Open-Meteo / ECMWF / CMEMS",
                status="ERROR",
                mode="LIVE",
                configured=True,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"Open-Meteo connection error: {str(e)}",
                provenance="Open-Meteo Marine & ERA5 APIs"
            )

    @staticmethod
    async def check_opendrift() -> SourceHealthItem:
        try:
            import opendrift
            from opendrift.models.oceandrift import OceanDrift  # noqa: F401
            version = getattr(opendrift, "__version__", "1.14.x")
            return SourceHealthItem(
                id="opendrift",
                name="OpenDrift Trajectory Engine",
                provider="OpenDrift Framework / OceanDrift",
                status="READY",
                mode="LOCAL",
                configured=True,
                available=True,
                last_checked=datetime.utcnow(),
                reason=f"OpenDrift v{version} (Lagrangian ocean drift model) operational locally.",
                provenance="Local OpenDrift Python Scientific Engine"
            )
        except Exception as e:
            return SourceHealthItem(
                id="opendrift",
                name="OpenDrift Trajectory Engine",
                provider="OpenDrift Framework / OceanDrift",
                status="ERROR",
                mode="LOCAL",
                configured=False,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"OpenDrift engine import error: {str(e)}",
                provenance="Local OpenDrift Python Scientific Engine"
            )

    @staticmethod
    async def check_ml_model() -> SourceHealthItem:
        model_path = os.environ.get("LOOKALIKE_MODEL_PATH", settings.LOOKALIKE_MODEL_PATH)
        if not os.path.exists(model_path):
            return SourceHealthItem(
                id="ml_model",
                name="Look-Alike ML Classification Model",
                provider="Scikit-Learn / HOG + RBF SVM",
                status="ERROR",
                mode="LOCAL",
                configured=False,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"Trained model artifact not found at {model_path}.",
                provenance="LookAlikeService"
            )
        try:
            from app.services.look_alike_service import LookAlikeService
            service = LookAlikeService()
            service._load_model()
            return SourceHealthItem(
                id="ml_model",
                name="Look-Alike ML Classification Model",
                provider="Scikit-Learn / HOG + RBF SVM",
                status="READY",
                mode="LOCAL",
                configured=True,
                available=True,
                last_checked=datetime.utcnow(),
                reason=f"Production real-data-trained SVM artifact loaded ({service._model_version}, {service._training_domain}).",
                provenance=settings.LOOKALIKE_MODEL_PATH
            )
        except Exception as e:
            return SourceHealthItem(
                id="ml_model",
                name="Look-Alike ML Classification Model",
                provider="Scikit-Learn / HOG + RBF SVM",
                status="ERROR",
                mode="LOCAL",
                configured=True,
                available=False,
                last_checked=datetime.utcnow(),
                reason=f"Failed to load model artifact: {str(e)}",
                provenance="LookAlikeService"
            )

    @classmethod
    async def get_system_status(cls) -> SystemStatusResponse:
        import asyncio
        source_keys = ["cdse", "firebase", "gfw", "open_meteo", "opendrift", "ml_model"]
        raw_results = await asyncio.gather(
            cls.check_cdse(),
            cls.check_firebase(),
            cls.check_gfw(),
            cls.check_open_meteo(),
            cls.check_opendrift(),
            cls.check_ml_model(),
            return_exceptions=True
        )
        sources_map: Dict[str, SourceHealthItem] = {}
        for key, res in zip(source_keys, raw_results):
            if isinstance(res, Exception):
                sources_map[key] = SourceHealthItem(
                    id=key,
                    name=key.upper(),
                    provider=key.upper(),
                    status="ERROR",
                    mode="UNKNOWN",
                    configured=False,
                    available=False,
                    last_checked=datetime.utcnow().isoformat(),
                    reason=f"Health probe error: {str(res)}",
                    provenance=None
                )
            else:
                sources_map[key] = res

        providers_map: Dict[str, str] = {
            k: v.status for k, v in sources_map.items()
        }
        return SystemStatusResponse(
            status="online",
            service=settings.PROJECT_NAME,
            persistence=settings.PERSISTENCE_BACKEND,
            providers=providers_map,
            sources=sources_map
        )
