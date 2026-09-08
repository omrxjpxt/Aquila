import os
import hashlib
import mimetypes
import logging
from datetime import datetime
from typing import Dict, Any
from firebase_admin import storage
from app.services.artifact_store import ArtifactStore

logger = logging.getLogger(__name__)

class CloudStorageArtifactStore(ArtifactStore):
    def _hash_file(self, file_path: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def store_artifact(self, source_path: str, artifact_type: str, job_id: str) -> Dict[str, Any]:
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"Source artifact not found: {source_path}")

        file_name = os.path.basename(source_path)
        file_size = os.path.getsize(source_path)
        file_hash = self._hash_file(source_path)
        mime_type, _ = mimetypes.guess_type(source_path)
        mime_type = mime_type or "application/octet-stream"
        
        artifact_id = f"art-{file_hash[:8]}"
        blob_path = f"artifacts/{job_id}/{file_name}"
        
        # Upload to GCS
        bucket = storage.bucket()
        blob = bucket.blob(blob_path)
        
        # Check if exists to avoid redundant uploads
        if not blob.exists():
            logger.info(f"Uploading {source_path} to gs://{bucket.name}/{blob_path}")
            blob.upload_from_filename(source_path, content_type=mime_type)
        else:
            logger.info(f"Artifact {blob_path} already exists in GCS. Skipping upload.")

        return {
            "artifact_id": artifact_id,
            "artifact_type": artifact_type,
            "storage_backend": "gcs",
            "path": blob_path,  # Store the relative GCS blob path
            "mime_type": mime_type,
            "size_bytes": file_size,
            "sha256": file_hash,
            "created_at": datetime.utcnow().isoformat()
        }

    def get_artifact_path(self, artifact_ref: Dict[str, Any]) -> str:
        """
        Returns a local path if we want to download it, or a signed URL.
        For scientific services, we'll download it to a temporary local cache.
        """
        blob_path = artifact_ref.get("path")
        if not blob_path:
            raise ValueError("Artifact reference missing 'path'")
            
        # Download locally for backend processing
        # In a real system, we'd cache this more robustly
        local_cache_dir = os.path.join("data", "cache", "gcs")
        os.makedirs(local_cache_dir, exist_ok=True)
        
        file_name = os.path.basename(blob_path)
        local_path = os.path.join(local_cache_dir, file_name)
        
        if not os.path.exists(local_path):
            bucket = storage.bucket()
            blob = bucket.blob(blob_path)
            if not blob.exists():
                raise FileNotFoundError(f"Artifact not found in GCS: {blob_path}")
                
            logger.info(f"Downloading {blob_path} to {local_path}")
            blob.download_to_filename(local_path)
            
        return local_path
