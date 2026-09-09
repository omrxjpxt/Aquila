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

    def exists(self, artifact_ref: Dict[str, Any]) -> bool:
        """Checks if the artifact currently exists in storage."""
        raise NotImplementedError

    def get_metadata(self, artifact_ref: Dict[str, Any]) -> Dict[str, Any]:
        """Retrieves current metadata, size, and hash without downloading."""
        raise NotImplementedError

    def list_orphans(self, active_job_ids: list[str], max_age_hours: int = 24) -> list[Dict[str, Any]]:
        """Returns a list of artifacts not belonging to an active job, older than max_age."""
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
        return path

    def exists(self, artifact_ref: Dict[str, Any]) -> bool:
        path = artifact_ref.get("path")
        return bool(path and os.path.exists(path))

    def get_metadata(self, artifact_ref: Dict[str, Any]) -> Dict[str, Any]:
        path = artifact_ref.get("path")
        if not path or not os.path.exists(path):
            raise FileNotFoundError(f"Artifact missing: {artifact_ref}")
        
        file_size = os.path.getsize(path)
        file_hash = self._hash_file(path)
        mime_type, _ = mimetypes.guess_type(path)
        
        return {
            "size_bytes": file_size,
            "sha256": file_hash,
            "mime_type": mime_type or "application/octet-stream",
            "last_modified": datetime.fromtimestamp(os.path.getmtime(path)).isoformat()
        }

    def list_orphans(self, active_job_ids: list[str], max_age_hours: int = 24) -> list[Dict[str, Any]]:
        orphans = []
        now = datetime.utcnow()
        for job_id_dir in os.listdir(self.base_dir):
            job_path = os.path.join(self.base_dir, job_id_dir)
            if not os.path.isdir(job_path):
                continue
                
            if job_id_dir in active_job_ids:
                continue
                
            for file_name in os.listdir(job_path):
                file_path = os.path.join(job_path, file_name)
                if not os.path.isfile(file_path):
                    continue
                    
                mtime = datetime.fromtimestamp(os.path.getmtime(file_path))
                age_hours = (now - mtime).total_seconds() / 3600
                
                if age_hours > max_age_hours:
                    orphans.append({
                        "job_id": job_id_dir,
                        "file_name": file_name,
                        "path": file_path,
                        "age_hours": age_hours,
                        "size_bytes": os.path.getsize(file_path)
                    })
        return orphans
