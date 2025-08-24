# Shared Clerk JWT verification for FastAPI services
import os
import time
import requests
from typing import Dict, Any
from fastapi import Header, HTTPException
from jose import jwt

JWKS_URL = os.getenv("CLERK_JWKS_URL") or (
    os.getenv("CLERK_ISSUER", "").rstrip("/") + "/.well-known/jwks.json"
)
_cached_jwks: Dict[str, Any] | None = None
_cached_at: float = 0.0


def _get_jwks() -> Dict[str, Any]:
    global _cached_jwks, _cached_at
    if not JWKS_URL:
        raise HTTPException(
            status_code=500, detail="CLERK_JWKS_URL or CLERK_ISSUER not configured"
        )
    if _cached_jwks is None or time.time() - _cached_at > 3600:
        resp = requests.get(JWKS_URL, timeout=5)
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to fetch JWKS")
        _cached_jwks = resp.json()
        _cached_at = time.time()
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
        return jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")






