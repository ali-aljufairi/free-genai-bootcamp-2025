# Shared Clerk JWT verification for FastAPI services
import os
import time
import requests
from typing import Dict, Any
from fastapi import Header, HTTPException
from jose import jwt
from urllib.parse import urlparse


def _get_jwks_url() -> str:
    """Get JWKS URL from environment variables with proper validation."""
    jwks_url = os.getenv("CLERK_JWKS_URL")
    if jwks_url:
        # Validate URL format
        parsed = urlparse(jwks_url)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(
                f"Invalid CLERK_JWKS_URL format: {jwks_url}. Must be a full URL (e.g., https://clerk.example.com/.well-known/jwks.json)"
            )
        return jwks_url

    # Try to construct from CLERK_ISSUER
    issuer = os.getenv("CLERK_ISSUER")
    if issuer:
        issuer = issuer.rstrip("/")
        # Validate issuer URL format
        parsed = urlparse(issuer)
        if not parsed.scheme or not parsed.netloc:
            raise ValueError(
                f"Invalid CLERK_ISSUER format: {issuer}. Must be a full URL (e.g., https://clerk.example.com)"
            )
        jwks_url = f"{issuer}/.well-known/jwks.json"
        return jwks_url

    raise ValueError(
        "CLERK_JWKS_URL or CLERK_ISSUER must be configured. "
        "Set CLERK_JWKS_URL=https://clerk.your-domain.com/.well-known/jwks.json "
        "or CLERK_ISSUER=https://clerk.your-domain.com"
    )


# Initialize JWKS_URL at module load time
try:
    JWKS_URL = _get_jwks_url()
except ValueError as e:
    # Store error message for better error reporting
    JWKS_URL = None
    _JWKS_URL_ERROR = str(e)
else:
    _JWKS_URL_ERROR = None

_cached_jwks: Dict[str, Any] | None = None
_cached_at: float = 0.0


def _get_jwks() -> Dict[str, Any]:
    global _cached_jwks, _cached_at, JWKS_URL

    # Check if JWKS_URL is configured
    if not JWKS_URL:
        if _JWKS_URL_ERROR:
            raise HTTPException(status_code=500, detail=_JWKS_URL_ERROR)
        raise HTTPException(
            status_code=500, detail="CLERK_JWKS_URL or CLERK_ISSUER not configured"
        )

    if _cached_jwks is None or time.time() - _cached_at > 3600:
        try:
            resp = requests.get(JWKS_URL, timeout=5)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=401,
                    detail=f"Failed to fetch JWKS from {JWKS_URL}: HTTP {resp.status_code}",
                )
            _cached_jwks = resp.json()
            _cached_at = time.time()
        except requests.exceptions.RequestException as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch JWKS from {JWKS_URL}: {str(e)}",
            )
    return _cached_jwks


def verify_bearer(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        jwks = _get_jwks()
        key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
        if not key:
            raise HTTPException(status_code=401, detail="Unknown KID")
        # Clerk tokens often use RS256
        alg = key.get("alg", "RS256")
        claims = jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
        return claims
    except HTTPException:
        raise
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.error(f"Token verification error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=401, detail=f"Token verification failed: {str(e)}"
        )


def get_user_id_from_claims(claims: dict, token: str) -> int | None:
    """
    Extract user_id from JWT claims by calling Go backend API.
    The Go backend handles user creation automatically.

    Args:
        claims: JWT claims dictionary
        token: The JWT bearer token to use for API calls

    Returns:
        The database user_id, or None if unable to retrieve
    """
    import logging

    logger = logging.getLogger(__name__)

    clerk_id = claims.get("sub")
    if not clerk_id:
        logger.warning("No 'sub' claim found in JWT token")
        return None

    # Get Go backend URL from environment
    go_backend_url = os.getenv("GO_BACKEND_URL", "http://localhost:8080")

    try:
        # Call Go backend /api/langportal/users/me endpoint
        # This will automatically create the user if they don't exist
        response = requests.get(
            f"{go_backend_url}/api/langportal/users/me",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=5,
        )

        if response.status_code == 200:
            user_data = response.json()
            # Go backend returns nested structure: {"user": {"id": 1, ...}, "settings": {...}, "roles": [...]}
            user_id = None
            if "user" in user_data and isinstance(user_data["user"], dict):
                user_id = user_data["user"].get("id")
            elif "id" in user_data:
                user_id = user_data.get("id")
            elif "user_id" in user_data:
                user_id = user_data.get("user_id")

            if user_id:
                logger.info(
                    f"Retrieved user_id {user_id} for Clerk ID {clerk_id} from Go backend"
                )
                return int(user_id)
            else:
                logger.warning(f"Go backend response missing user_id: {user_data}")
                return None
        elif response.status_code == 401:
            logger.error(f"Go backend returned 401 for Clerk ID {clerk_id}")
            return None
        else:
            logger.error(
                f"Go backend returned status {response.status_code} for Clerk ID {clerk_id}: {response.text}"
            )
            return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to call Go backend API for Clerk ID {clerk_id}: {e}")
        return None






