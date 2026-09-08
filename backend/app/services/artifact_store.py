import os
import hashlib
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import mimetypes

logger = logging.getLogger(__name__)

class ArtifactStore:
    def store_artifact(self, source_path: str, artifact_type: str, job_id: str) -> Dict[str, Any]:
        """Stores a file and returns its durable metadata reference."""
        raise NotImplementedError

    def get_artifact_path(self, artifact_ref: Dict[str, Any]) -> str:
        """Returns the local path or URL to access the artifact."""
        raise NotImplementedError


class LocalArtifactStore(ArtifactStore):
    """
    Phase 16D Implementation:
    Stores artifacts securely on the local disk under data/artifacts/
    and calculates hashes for integrity checks.
    """
    def __init__(self, base_dir: str = "data/artifacts"):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

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
        dest_dir = os.path.join(self.base_dir, job_id)
        os.makedirs(dest_dir, exist_ok=True)
        
        dest_path = os.path.join(dest_dir, file_name)
        
        # In a real cloud setup, we would upload. Here we just move/copy.
        # If the file is already in dest_dir, we don't copy.
        if os.path.abspath(source_path) != os.path.abspath(dest_path):
            import shutil
            shutil.copy2(source_path, dest_path)
            
        file_size = os.path.getsize(dest_path)
        file_hash = self._hash_file(dest_path)
        mime_type, _ = mimetypes.guess_type(dest_path)
        
        return {
            "artifact_id": f"art-{file_hash[:8]}",
            "artifact_type": artifact_type,
            "storage_backend": "LOCAL",
            "path": dest_path,
            "mime_type": mime_type or "application/octet-stream",
            "size_bytes": file_size,
            "sha256": file_hash,
            "created_at": datetime.utcnow().isoformat()
        }

    def get_artifact_path(self, artifact_ref: Dict[str, Any]) -> str:
        path = artifact_ref.get("path")
        if not path or not os.path.exists(path):
            raise FileNotFoundError(f"Artifact missing: {artifact_ref}")
        
        # Optional: Re-verify integrity if required by strict policy
        # current_hash = self._hash_file(path)
        # if current_hash != artifact_ref.get("sha256"):
        #     raise ValueError("Artifact integrity failed.")
            
        return path

artifact_store = LocalArtifactStore()
