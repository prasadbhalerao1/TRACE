"""Create interview_definitions table and add interview_definition_id FK to interview_sessions.

Revision ID: g2h3i4j5k6l7
Revises: f1a2b3c4d5e6
Create Date: 2026-07-31 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'g2h3i4j5k6l7'
down_revision: Union[str, Sequence[str], None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create interview_definitions table
    op.create_table(
        'interview_definitions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by_user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('role_title', sa.Text(), nullable=False),
        sa.Column('job_description', sa.Text(), nullable=False),
        sa.Column('years_experience', sa.Integer(), nullable=True),
        sa.Column('questions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('question_count', sa.Integer(), nullable=False),
        sa.Column('duration_minutes', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    # Create index on created_by_user_id
    op.create_index('idx_interview_definitions_created_by', 'interview_definitions', ['created_by_user_id'])

    # Add interview_definition_id FK to interview_sessions
    op.add_column('interview_sessions', sa.Column('interview_definition_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(None, 'interview_sessions', 'interview_definitions', ['interview_definition_id'], ['id'])


def downgrade() -> None:
    # Drop FK from interview_sessions
    op.drop_constraint(None, 'interview_sessions', type_='foreignkey')
    op.drop_column('interview_sessions', 'interview_definition_id')

    # Drop interview_definitions table
    op.drop_index('idx_interview_definitions_created_by')
    op.drop_table('interview_definitions')
