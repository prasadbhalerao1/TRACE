"""Add missing indexes on interview_sessions.candidate_id and interview_sessions.job_id.

Both columns have FKs but no index, unlike interview_transcripts which is already
indexed on (session_id, turn_index). Every interview_turn/end_interview call and any
"my interviews" list query full-scans interview_sessions without these.

Revision ID: h3i4j5k6l7m8
Revises: g2h3i4j5k6l7
Create Date: 2026-07-31 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'h3i4j5k6l7m8'
down_revision: Union[str, Sequence[str], None] = 'g2h3i4j5k6l7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('idx_interview_sessions_candidate_id', 'interview_sessions', ['candidate_id'], unique=False)
    op.create_index('idx_interview_sessions_job_id', 'interview_sessions', ['job_id'], unique=False)


def downgrade() -> None:
    op.drop_index('idx_interview_sessions_job_id', table_name='interview_sessions')
    op.drop_index('idx_interview_sessions_candidate_id', table_name='interview_sessions')
