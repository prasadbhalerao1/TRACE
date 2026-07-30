"""
User Controller & Authentication Endpoints.
Handles user identity resolution (/me) and post-Clerk onboarding.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import CandidateProfile, User
from packages.shared_schemas.users import MeResponse, OnboardingRequest, UserProfile
from services.api.core.clerk_client import fetch_clerk_user, full_name, primary_email
from services.api.core.db import get_db
from services.api.core.rbac import AuthContext, get_auth_context
from services.api.modules.candidates.router import _RESERVED_USERNAMES, _USERNAME_PATTERN

router = APIRouter(tags=["User Authentication & Onboarding"])


@router.get("/me", response_model=MeResponse)
async def me(ctx: AuthContext = Depends(get_auth_context)) -> MeResponse:
    """Returns the current authenticated user profile or signals that onboarding is required."""
    if ctx.user is None:
        return MeResponse(onboarding_required=True)
    return MeResponse(onboarding_required=False, profile=UserProfile.model_validate(ctx.user))


@router.post("/users/onboarding", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def onboard(
    payload: OnboardingRequest,
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> UserProfile:
    """Completes initial user onboarding, storing user role and metadata in PostgreSQL."""
    if ctx.user is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="already_onboarded")

    clerk_user = await fetch_clerk_user(ctx.clerk_user_id)
    email = primary_email(clerk_user)
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="no_verified_email")

    user = User(
        email=email,
        full_name=payload.full_name or full_name(clerk_user),
        role=payload.role.value,
        auth_provider_id=ctx.clerk_user_id,
    )
    db.add(user)
    await db.flush()  # get user.id without committing yet

    # For candidates: eagerly create their CandidateProfile and optionally set the
    # username slug if they provided one. This means the dashboard's publish toggle
    # never needs to re-ask for a username — it's already there from signup.
    if payload.role.value == "candidate" and payload.username:
        username = payload.username.strip().lower()
        if not _USERNAME_PATTERN.match(username) or username in _RESERVED_USERNAMES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_username")
        existing = await db.execute(
            select(CandidateProfile).where(CandidateProfile.username == username)
        )
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="username_taken")
        db.add(CandidateProfile(user_id=user.id, username=username))

    await db.commit()
    await db.refresh(user)
    return UserProfile.model_validate(user)
