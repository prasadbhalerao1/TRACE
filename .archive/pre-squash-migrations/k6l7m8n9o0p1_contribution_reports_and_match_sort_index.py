"""Add missing index on contribution_reports.candidate_id and a sort-matching index on match_scores.

Direct verification (not just grep) found most FK columns flagged as "missing" by an
earlier pass already had indexes from other migrations (submissions.candidate_id,
fraud_flags.candidate_id, interview_sessions.candidate_id all already indexed). The two
real gaps:

- contribution_reports.candidate_id has an FK but no index — read by every candidate
  dashboard/report lookup, only repo_full_name was indexed.
- match_scores has idx_match_scores_job_time on (job_id, computed_at), but
  GET /jobs/{id}/matches filters by job_id and orders by match_percentage, not
  computed_at — that index's second column doesn't match the actual sort, so add a
  composite index on (job_id, match_percentage) to cover it.

Revision ID: k6l7m8n9o0p1
Revises: j5k6l7m8n9o0
Create Date: 2026-07-31 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'k6l7m8n9o0p1'
down_revision: Union[str, Sequence[str], None] = 'j5k6l7m8n9o0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        'idx_contribution_reports_candidate_id', 'contribution_reports', ['candidate_id'], unique=False
    )
    op.create_index(
        'idx_match_scores_job_percentage', 'match_scores', ['job_id', 'match_percentage'], unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_match_scores_job_percentage', table_name='match_scores')
    op.drop_index('idx_contribution_reports_candidate_id', table_name='contribution_reports')
