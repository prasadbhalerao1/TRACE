"""
Public Portfolio Controller.
Handles Public Candidate Portfolio SSR Requests.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.db.models import Badge, CandidateProfile, GithubSnapshot, TalentScore
from packages.shared_schemas.candidates import (
    BadgeResponse,
    PublicPortfolioProject,
    PublicPortfolioResponse,
)
from services.api.core.db import get_db

router = APIRouter(prefix="/public", tags=["Public Portfolios"])


@router.get("/candidates/{username}", response_model=PublicPortfolioResponse)
async def get_public_portfolio(
    username: str,
    db: AsyncSession = Depends(get_db),
) -> PublicPortfolioResponse:
    result = await db.execute(
        select(CandidateProfile).where(
            CandidateProfile.username == username.strip().lower(),
            CandidateProfile.portfolio_published.is_(True),
        )
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="portfolio_not_found")

    projects_result = await db.execute(
        select(GithubSnapshot)
        .where(GithubSnapshot.candidate_id == profile.id, GithubSnapshot.is_fork.is_not(True))
        .order_by(GithubSnapshot.stars.desc().nulls_last())
        .limit(12)
    )
    projects = [
        PublicPortfolioProject(
            repo_full_name=p.repo_full_name, stars=p.stars, forks=p.forks, languages=p.languages
        )
        for p in projects_result.scalars().all()
    ]

    badges_result = await db.execute(select(Badge).where(Badge.candidate_id == profile.id))
    badges = [BadgeResponse.model_validate(b) for b in badges_result.scalars().all()]

    score_result = await db.execute(
        select(TalentScore)
        .where(TalentScore.candidate_id == profile.id)
        .order_by(TalentScore.computed_at.desc())
        .limit(1)
    )
    latest_score = score_result.scalar_one_or_none()

    return PublicPortfolioResponse(
        username=profile.username,
        headline=profile.headline,
        location=profile.location,
        skills=profile.skills,
        experience=profile.experience,
        education=profile.education,
        projects=projects,
        badges=badges,
        overall_score=latest_score.overall if latest_score else None,
        updated_at=profile.updated_at,
    )
