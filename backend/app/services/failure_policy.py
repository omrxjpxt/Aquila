import httpx
from enum import Enum
from typing import Tuple

class FailureClassification(str, Enum):
    TRANSIENT = "TRANSIENT"
    PERMANENT = "PERMANENT"

def classify_failure(error: Exception, stage: str = "") -> Tuple[FailureClassification, str]:
    """
    Classifies an exception as TRANSIENT or PERMANENT.
    Returns (classification, reason).
    """
    
    # HTTP and Network Errors
    if isinstance(error, (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError, ConnectionError)):
        return FailureClassification.TRANSIENT, "Network or timeout error"
        
    if isinstance(error, httpx.HTTPStatusError):
        status_code = error.response.status_code
        if status_code in (429, 500, 502, 503, 504):
            return FailureClassification.TRANSIENT, f"HTTP {status_code} server/rate-limit error"
        if status_code in (401, 403, 404):
            return FailureClassification.PERMANENT, f"HTTP {status_code} auth/not-found error"
            
    # File missing
    if isinstance(error, FileNotFoundError):
        # A missing source raster is permanent. 
        # A missing intermediate artifact might be recoverable if we re-ran from scratch, 
        # but in our current stage-based retry without rewind, it's typically permanent.
        if "data/scenes" in str(error) or "data/artifacts" in str(error):
            return FailureClassification.PERMANENT, "Required artifact missing"
        return FailureClassification.PERMANENT, "File not found"
        
    # Data structure / input validity
    if isinstance(error, (ValueError, KeyError, TypeError)):
        return FailureClassification.PERMANENT, "Invalid input, malformed data, or configuration error"
        
    # By default, unknown errors are treated as permanent to avoid infinite retry loops on bugs
    return FailureClassification.PERMANENT, "Unknown unclassified error"
