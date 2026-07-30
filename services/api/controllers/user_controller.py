"""
User Controller & Authentication Endpoints.
Handles user identity resolution (/me) and post-Clerk onboarding.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import User
from packages.shared_schemas.users import MeResponse, OnboardingRequest, UserProfile
from services.api.core.clerk_client import fetch_clerk_user, full_name, primary_email
from services.api.core.db import get_db
from services.api.core.rbac import AuthContext, get_auth_context

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
    await db.commit()
    await db.refresh(user)
    return UserProfile.model_validate(user)
