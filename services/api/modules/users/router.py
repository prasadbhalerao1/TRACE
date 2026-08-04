"""
User Controller & Authentication Endpoints.
Handles authentication (signup/login) and user profile retrieval.
"""
import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import CandidateProfile, User
from packages.shared_schemas.users import LoginRequest, MeResponse, SignupRequest, TokenResponse, UserProfile
from services.api.core.db import get_db
from services.api.core.rbac import AuthContext, get_auth_context
from services.api.core.security import create_access_token, hash_password, verify_password
from services.api.core.config import get_settings
from services.api.modules.candidates.router import _RESERVED_USERNAMES, _USERNAME_PATTERN

router = APIRouter(tags=["User Authentication"])


@router.get("/me", response_model=MeResponse)
async def me(ctx: AuthContext = Depends(get_auth_context)) -> MeResponse:
    """Returns the current authenticated user profile."""
    if ctx.user is None:
        return MeResponse(onboarding_required=True)
    return MeResponse(onboarding_required=False, profile=UserProfile.model_validate(ctx.user))


@router.post("/auth/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Registers a new user and returns an access token."""
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="email_taken")

    # bcrypt is deliberately CPU-slow; thread it so it doesn't stall the event loop.
    password_hash = await asyncio.to_thread(hash_password, payload.password)

    user = User(
        email=payload.email,
        password_hash=password_hash,
        full_name=payload.full_name,
        role=payload.role.value,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    if payload.role.value == "candidate" and payload.username:
        username = payload.username.strip().lower()
        if not _USERNAME_PATTERN.match(username) or username in _RESERVED_USERNAMES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_username")
        existing_username = await db.execute(
            select(CandidateProfile).where(CandidateProfile.username == username)
        )
        if existing_username.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")
        db.add(CandidateProfile(user_id=user.id, username=username))

    await db.commit()
    await db.refresh(user)

    settings = get_settings()
    token = create_access_token(str(user.id), settings)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        profile=UserProfile.model_validate(user),
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticates a user and returns an access token."""
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    password_ok = user is not None and await asyncio.to_thread(
        verify_password, payload.password, user.password_hash
    )
    if not password_ok:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid_credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="account_disabled")

    settings = get_settings()
    token = create_access_token(str(user.id), settings)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        profile=UserProfile.model_validate(user),
    )
