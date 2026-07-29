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


# --- FR-4: AI Career Guidance System ---


class CareerGuidanceResponse(BaseModel):
    """FR-4.1-4.5. `salary_estimate_low`/`salary_estimate_high` are a range only —
    never a point estimate (doc 01 §8) — and are `None` together when no Talent Score
    or no trained salary model is available yet (cold start, not fabrication)."""

    target_role: str | None
    skill_gaps: list[dict]  # [{skill, similarity, weight, priority}], worst gap first
    recommended_courses: list[dict]  # course_catalog rows matched to the gaps above
    roadmap: dict  # {"stages": [{"stage","skills","estimated_weeks","description"}]}
    salary_estimate_low: int | None
    salary_estimate_high: int | None
    salary_rationale: str | None = None
    generated_at: datetime
