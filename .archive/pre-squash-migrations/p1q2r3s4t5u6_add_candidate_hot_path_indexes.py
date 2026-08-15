"""Add missing indexes on github_snapshots.candidate_id and badges.candidate_id.

Revision ID: p1q2r3s4t5u6
Revises: o0p1q2r3s4t5
Create Date: 2026-08-04 00:00:00.000000

Both columns are foreign keys that are filtered on in the hottest read paths in the app
— the candidate dashboard (`/me/dashboard`, `/me/github-summary`), the public portfolio,
and, most expensively, `recruitment/router.py::_build_candidate_pool`, which IN-filters
both tables across the entire candidate set on every job creation, match recompute, and
Copilot query. Postgres does not create indexes for foreign keys automatically, and
neither table declared one, so all of those were sequential scans.

Every other candidate-scoped table in this schema (talent_scores, generated_documents,
career_recommendations, certifications) already has the equivalent index; these two were
simply missed.

Guarded with IF NOT EXISTS so this is safe against a database where they were added
out-of-band, matching the convention in o0p1q2r3s4t5.
"""
from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'p1q2r3s4t5u6'
down_revision: Union[str, Sequence[str], None] = 'o0p1q2r3s4t5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_github_snapshots_candidate "
        "ON github_snapshots (candidate_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_badges_candidate ON badges (candidate_id)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_badges_candidate")
    op.execute("DROP INDEX IF EXISTS idx_github_snapshots_candidate")
