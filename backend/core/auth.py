"""
JWT authentication dependency for FastAPI.

Supabase now issues ES256 (ECDSA) tokens by default for newer projects.
We verify these using Supabase's public JWKS endpoint, with an in-process
cache so the public key is only fetched once per server startup.
"""
import logging
from functools import lru_cache

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import JWTError, jwt
from jose.backends import ECKey

from core.config import settings

logger = logging.getLogger(__name__)

JWKS_URL = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"


@lru_cache(maxsize=1)
def _get_jwks() -> dict:
    """Fetch and cache Supabase public JWKS (called once per process)."""
    response = httpx.get(JWKS_URL, timeout=10.0)
    response.raise_for_status()
    return response.json()


def _decode_token(token: str) -> dict:
    """
    Decode a Supabase JWT supporting both ES256 (new projects) and
    HS256 (legacy projects). Falls back between algorithms automatically.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token geçersiz veya süresi dolmuş.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try ES256 via JWKS first (new Supabase default)
    try:
        jwks = _get_jwks()
        keys = jwks.get("keys", [])
        if keys:
            # Build a JWK-compatible key dict for python-jose
            jwk_key = keys[0]  # Supabase only has one active signing key
            payload = jwt.decode(
                token,
                jwk_key,
                algorithms=["ES256"],
                options={"verify_aud": False},
            )
            user_id: str | None = payload.get("sub")
            if not user_id:
                raise credentials_exception
            return payload
    except JWTError:
        pass  # fall through to HS256 attempt
    except Exception as exc:
        logger.warning("JWKS fetch/decode failed, trying HS256: %s", exc)

    # Fall back to HS256 (legacy Supabase projects)
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id = payload.get("sub")
        if not user_id:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def get_current_user(authorization: str = Header(...)) -> str:
    """
    FastAPI dependency that validates the Supabase JWT from the Authorization header.
    Returns the authenticated user's UUID (sub claim).
    Raises HTTP 401 if token is missing, malformed, or expired.
    Supports both ES256 (new Supabase) and HS256 (legacy Supabase) tokens.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token geçersiz veya süresi dolmuş.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not authorization.startswith("Bearer "):
        raise credentials_exception

    token = authorization.removeprefix("Bearer ").strip()

    try:
        payload = _decode_token(token)
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception
        return user_id
    except HTTPException:
        raise
    except Exception:
        raise credentials_exception


# Ready-to-use dependency alias for route handlers
CurrentUser = Depends(get_current_user)
