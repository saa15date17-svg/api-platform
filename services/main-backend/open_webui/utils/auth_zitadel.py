"""Zitadel OIDC token validation for MainBackend.

Validates JWT tokens issued by Zitadel (the platform's OIDC provider).
Works alongside the existing JWT auth system — both are accepted.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Optional

import httpx
import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import PyJWKClient
from pydantic import BaseModel

from open_webui.env import (
    ZITADEL_OIDC_URL,
    ZITADEL_OPENWEBUI_CLIENT_ID,
)
from open_webui.models.users import UserModel, Users

log = logging.getLogger(__name__)

# Cache for Zitadel JWKS keys
_jwks_client: Optional[PyJWKClient] = None
_jwks_url: Optional[str] = None


def _get_jwks_client() -> PyJWKClient:
    """Get or create cached JWKS client for Zitadel."""
    global _jwks_client, _jwks_url
    oidc_url = ZITADEL_OIDC_URL.rstrip("/")
    keys_url = f"{oidc_url}/.well-known/jwks.json"

    if _jwks_client is None or _jwks_url != keys_url:
        _jwks_url = keys_url
        _jwks_client = PyJWKClient(keys_url, cache_keys=True)
    return _jwks_client


async def verify_zitadel_token(token: str) -> Optional[dict]:
    """Verify a Zitadel-issued JWT and return its claims.

    Supports both access tokens and ID tokens issued by Zitadel.
    Returns None if the token is invalid.
    """
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "RS384", "RS512"],
            audience=ZITADEL_OPENWEBUI_CLIENT_ID,
            options={"verify_exp": True},
        )
        return claims
    except jwt.ExpiredSignatureError:
        log.warning("Zitadel token expired")
        return None
    except jwt.InvalidAudienceError:
        # Some tokens have different audience — try without audience check
        try:
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "RS384", "RS512"],
                options={"verify_exp": True, "verify_aud": False},
            )
            return claims
        except Exception as e:
            log.warning(f"Zitadel token validation failed (no audience): {e}")
            return None
    except Exception as e:
        log.warning(f"Zitadel token validation failed: {e}")
        return None


async def get_or_create_user_from_zitadel(claims: dict) -> Optional[UserModel]:
    """Find or create a MainBackend user from Zitadel OIDC claims.

    Zitadel user info is mapped as follows:
      - sub (user ID) → stored in oauth_sub field
      - email → user email
      - name / given_name + family_name → user name
      - preferred_username → fallback for name
    """
    sub = claims.get("sub", "")
    email = claims.get("email", "")
    name = (
        claims.get("name")
        or f"{claims.get('given_name', '')} {claims.get('family_name', '')}".strip()
        or claims.get("preferred_username", "")
    )

    if not sub:
        return None

    # Try to find existing user by Zitadel sub
    user = await Users.get_user_by_oauth_sub(sub)
    if user:
        return user

    # Try by email
    if email:
        user = await Users.get_user_by_email(email)
        if user:
            return user

    # Create new user if signup is enabled
    from open_webui.config import ENABLE_SIGNUP
    if not ENABLE_SIGNUP:
        log.info(f"Signup disabled — not creating user for {email}")
        return None

    from open_webui.models.config import Config

    default_role = await Config.get("user.default_role", "pending")
    user = await Users.insert_new_user(
        id=str(uuid.uuid4()),
        email=email,
        name=name or email.split("@")[0],
        role=default_role,
        oauth={"zitadel": {"sub": sub}},
    )
    return user


async def get_current_user_by_zitadel(
    request: Request,
) -> UserModel:
    """FastAPI dependency: validate Zitadel token and return user.

    Usage:
        @router.get("/protected")
        async def handler(user: UserModel = Depends(get_current_user_by_zitadel)):
            ...
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = auth_header[7:]  # Remove "Bearer "

    # Try existing JWT auth first (backward compatibility)
    from open_webui.utils.auth import get_current_user

    try:
        return await get_current_user(request)
    except HTTPException:
        pass

    # Try Zitadel token validation
    claims = await verify_zitadel_token(token)
    if not claims:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user = await get_or_create_user_from_zitadel(claims)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
