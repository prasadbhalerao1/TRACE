"""Talent Score v2: index submissions.candidate_id for the new assessment_bridge lookup,
add confidence columns to talent_scores for the Evidence Confidence Score.

Revision ID: i4j5k6l7m8n9
Revises: h3i4j5k6l7m8
Create Date: 2026-07-31 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'i4j5k6l7m8n9'
down_revision: Union[str, Sequence[str], None] = 'h3i4j5k6l7m8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('idx_submissions_candidate', 'submissions', ['candidate_id'], unique=False)
    op.add_column('talent_scores', sa.Column('confidence_available_signals', sa.Integer(), nullable=True))
    op.add_column('talent_scores', sa.Column('confidence_expected_signals', sa.Integer(), nullable=True))
    op.add_column('talent_scores', sa.Column('confidence', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('talent_scores', 'confidence')
    op.drop_column('talent_scores', 'confidence_expected_signals')
    op.drop_column('talent_scores', 'confidence_available_signals')
    op.drop_index('idx_submissions_candidate', table_name='submissions')
