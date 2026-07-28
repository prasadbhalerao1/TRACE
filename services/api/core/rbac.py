import time
from typing import Any

import httpx
from fastapi import Depends, Header, HTTPException, status
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import User
from packages.shared_schemas.users import Role
from services.api.core.config import get_settings
from services.api.core.db import get_db

_JWKS_TTL_SECONDS = 3600
_jwks_cache: dict[str, Any] = {"keys": None, "fetched_at": 0.0}


async def _get_jwks() -> list[dict[str, Any]]:
    settings = get_settings()
    now = time.monotonic()
    if _jwks_cache["keys"] is None or now - _jwks_cache["fetched_at"] > _JWKS_TTL_SECONDS:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(settings.clerk_jwks_url)
            response.raise_for_status()
            _jwks_cache["keys"] = response.json()["keys"]
            _jwks_cache["fetched_at"] = now
    return _jwks_cache["keys"]


async def _verify_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    try:
        header = jwt.get_unverified_header(token)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token") from exc

    jwks = await _get_jwks()
    key = next((k for k in jwks if k["kid"] == header.get("kid")), None)
    if key is None:
        # Signing keys rotate rarely, but force one refetch before giving up.
        _jwks_cache["keys"] = None
        jwks = await _get_jwks()
        key = next((k for k in jwks if k["kid"] == header.get("kid")), None)
    if key is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="unknown_signing_key")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_token") from exc


class AuthContext:
    """Result of verifying a request's bearer token.

    `user` is None when the token is valid but no `users` row exists yet for this
    Clerk subject — that's the "onboarding required" state, not an error.
    """

    def __init__(self, clerk_user_id: str, user: User | None) -> None:
        self.clerk_user_id = clerk_user_id
        self.user = user


async def get_auth_context(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing_bearer_token")

    token = authorization.removeprefix("Bearer ").strip()
    claims = await _verify_token(token)
    clerk_user_id = claims["sub"]

    result = await db.execute(select(User).where(User.auth_provider_id == clerk_user_id))
    return AuthContext(clerk_user_id=clerk_user_id, user=result.scalar_one_or_none())


async def get_current_user(ctx: AuthContext = Depends(get_auth_context)) -> User:
    if ctx.user is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="onboarding_required")
    return ctx.user


def require_role(*roles: Role | str):
    allowed = {r.value if isinstance(r, Role) else r for r in roles}

    async def dependency(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_role")
        return user

    return dependency
