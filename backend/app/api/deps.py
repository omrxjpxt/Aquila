from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.firebase_admin import verify_id_token
from typing import Dict, Any, Optional

security = HTTPBearer(auto_error=False)

def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """
    Returns the user dictionary if a valid token is provided, otherwise None.
    Does not enforce authentication.
    """
    if credentials:
        token = credentials.credentials
        user = verify_id_token(token)
        if user:
            return user
    return None

def get_current_user(user: Optional[Dict[str, Any]] = Depends(get_optional_user)) -> Dict[str, Any]:
    """
    Enforces authentication. Raises 401 if no valid token is provided.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def enforce_ownership(user: Dict[str, Any], resource_owner_uid: str):
    """
    Raises 403 if the authenticated user does not own the resource and it is not a SYSTEM resource.
    """
    if resource_owner_uid == "SYSTEM":
        return
    if user.get("uid") != resource_owner_uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this resource"
        )
