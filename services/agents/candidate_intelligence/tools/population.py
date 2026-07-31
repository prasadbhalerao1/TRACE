"""Population queries for percentile normalization — DB access only, never called from
graph nodes (nodes stay pure per this module's convention; the router fetches this once
per ingestion request and passes it in via state, same as any other node input)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from packages.db.models.candidate import CandidateProfile, TalentScore

# Sub-scores percentile-normalized against the population (doc: community_participation,
# leadership). coding_ability/problem_solving use assessment_bridge.py's population instead.
_POPULATION_FIELDS = ("community_participation", "leadership")


async def latest_subscore_population(db: AsyncSession, field_name: str) -> list[float]:
    """Latest TalentScore.<field_name> per candidate, across all candidates.

    TalentScore is an append-only history table (one row per computation), so "latest
    per candidate" needs a window function rather than a plain SELECT.
    """
    if field_name not in _POPULATION_FIELDS and field_name not in TalentScore.__table__.columns:
        raise ValueError(f"Unknown TalentScore field: {field_name}")

    column = getattr(TalentScore, field_name)
    ranked = (
        select(
            column.label("value"),
            func.row_number()
            .over(partition_by=TalentScore.candidate_id, order_by=TalentScore.computed_at.desc())
            .label("rn"),
        )
        .where(column.is_not(None))
        .subquery()
    )
    result = await db.execute(select(ranked.c.value).where(ranked.c.rn == 1))
    return [row[0] for row in result.all()]


async def commit_count_population(db: AsyncSession) -> list[float]:
    """Total commit counts (sum of each candidate's github_stats.commit_activity_weekly)
    across all candidates with GitHub data — feeds coding_ability's language_score
    percentile normalization. No dedicated commit-count table exists; this JSONB column
    is the cheapest available population proxy (candidate_id is the primary key, so no
    "latest per candidate" window function is needed here, unlike TalentScore)."""
    result = await db.execute(
        select(CandidateProfile.github_stats).where(CandidateProfile.github_stats.is_not(None))
    )
    totals: list[float] = []
    for (stats,) in result.all():
        weekly = (stats or {}).get("commit_activity_weekly") or []
        if weekly:
            totals.append(float(sum(weekly)))
    return totals
