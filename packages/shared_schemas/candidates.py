from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

SUB_SCORE_NAMES = (
    "coding_ability",
    "problem_solving",
    "project_quality",
    "innovation",
    "technical_consistency",
    "community_participation",
    "leadership",
)


class SubScore(BaseModel):
    value: float | None  # 0-100, None when not yet computable (cold start)
    evidence: list[str] = []  # agent_run ids
    rationale: str | None = None


class CandidateProfileResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
    github_username: str | None
    headline: str | None
    location: str | None
    skills: list[dict] | None
    experience: list[dict] | None
    education: list[dict] | None
    merged_conflicts: list[dict] | None
    updated_at: datetime


class ConflictResolution(BaseModel):
    field: str
    resolved_value: str


class TalentScoreResponse(BaseModel):
    overall: float | None
    sub_scores: dict[str, SubScore]
    renormalized_subscores: list[str]
    score_version: str
    computed_at: datetime


class BadgeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    skill_name: str
    corroboration_sources: list[dict]
    awarded_at: datetime


class GithubIngestRequest(BaseModel):
    github_username: str


class DashboardResponse(BaseModel):
    profile: CandidateProfileResponse
    latest_score: TalentScoreResponse | None
    score_history: list[TalentScoreResponse]
    badges: list[BadgeResponse]
