"""Bridges candidate_intelligence's Talent Score to the assessment module (Module 3),
which produces real 0-100 Submission.score values but was never read by scoring — the
proposal's "assessment should remain the strongest signal because GitHub alone isn't
enough" gets applied here: coding_ability and problem_solving both draw on it.

DB access only, called from the router (not from graph nodes) — same convention as
population.py.

InterviewReport/ContributionReport are NOT bridged here: technical_rating and
contribution_share are on different scales (a 1-10ish rating and a 0-1 share, not a
0-100 score) and need their own normalization design before they can be blended in.
Left as a followup, not silently dropped.
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import func

from packages.db.models.assessment import Submission


async def latest_assessment_score(db: AsyncSession, candidate_id: str) -> float | None:
    result = await db.execute(
        select(Submission.score)
        .where(Submission.candidate_id == candidate_id, Submission.score.is_not(None))
        .order_by(Submission.submitted_at.desc())
        .limit(1)
    )
    row = result.first()
    return row[0] if row else None


async def assessment_score_population(db: AsyncSession) -> list[float]:
    """Latest Submission.score per candidate, across all candidates with a submission."""
    ranked = (
        select(
            Submission.score.label("value"),
            func.row_number()
            .over(partition_by=Submission.candidate_id, order_by=Submission.submitted_at.desc())
            .label("rn"),
        )
        .where(Submission.score.is_not(None))
        .subquery()
    )
    result = await db.execute(select(ranked.c.value).where(ranked.c.rn == 1))
    return [row[0] for row in result.all()]
