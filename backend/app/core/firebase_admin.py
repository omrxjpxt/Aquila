import firebase_admin
from firebase_admin import credentials, auth
import logging
import os
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

_firebase_initialized = False

def initialize_firebase_admin():
    global _firebase_initialized
    if _firebase_initialized:
        return
        
    if settings.PERSISTENCE_BACKEND != "firestore" and settings.ARTIFACT_STORAGE_BACKEND != "gcs":
        logger.info("Firebase Admin not initialized (PERSISTENCE_BACKEND is not 'firestore' and ARTIFACT_STORAGE_BACKEND is not 'gcs')")
        return

    if not settings.FIREBASE_SERVICE_ACCOUNT_PATH or not os.path.exists(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
        logger.warning(f"Firebase Admin Service Account file not found at {settings.FIREBASE_SERVICE_ACCOUNT_PATH}")
        return

    try:
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        firebase_admin.initialize_app(cred, {
            'projectId': settings.FIREBASE_PROJECT_ID,
            'storageBucket': settings.GCS_BUCKET_NAME
        })
        _firebase_initialized = True
        logger.info(f"Firebase Admin SDK initialized for project {settings.FIREBASE_PROJECT_ID}")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin SDK: {e}")


def verify_id_token(token: str) -> Optional[Dict[str, Any]]:
    if not _firebase_initialized:
        logger.warning("Attempted to verify token but Firebase Admin is not initialized")
        return None
        
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None
