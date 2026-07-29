"""recruitment tables (module 02)

Revision ID: ac395e67db4e
Revises: e8a55dc975da
Create Date: 2026-07-29 15:00:00.000000

Hand-written (not `alembic revision --autogenerate`), mirroring
`a333d4c53bd0_career_guidance_tables.py`'s structure. `applications.stage` uses the
architecture doc's 6-value vocabulary (`sourced,screened,interview_scheduled,offered,
rejected,hired`) — the most complete of three inconsistent stage lists found across
doc/SRS/02, doc/multi-agent-architecture/02, and two pre-existing frontend mock pages.
`applications.source` and `match_scores`'s `semantic_similarity`/`experience_match`/
`talent_score_alignment` columns aren't in either doc's SQL but are required to actually
compute/report doc 08 §2's 4-term formula and FR-4.3's source-of-hire breakdown — added
additively, same reasoning as Module 01's `candidate_profiles.username` column.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'ac395e67db4e'
down_revision: Union[str, Sequence[str], None] = 'e8a55dc975da'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'jobs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=True),
        sa.Column('posted_by_user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('required_skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('min_experience_years', sa.Integer(), nullable=True),
        sa.Column('location', sa.Text(), nullable=True),
        sa.Column('is_remote', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['posted_by_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'applications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('stage', sa.Text(), server_default='sourced', nullable=False),
        sa.Column('source', sa.Text(), nullable=True),
        sa.Column('applied_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('stage_updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint(
            "stage IN ('sourced','screened','interview_scheduled','offered','rejected','hired')",
            name='ck_applications_stage',
        ),
        sa.CheckConstraint(
            "source IS NULL OR source IN ('direct','copilot_search','hackathon')",
            name='ck_applications_source',
        ),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidate_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'candidate_id', name='uq_applications_job_candidate'),
    )
    op.create_index('idx_applications_job_stage', 'applications', ['job_id', 'stage'], unique=False)
    op.create_index('idx_applications_candidate', 'applications', ['candidate_id'], unique=False)

    op.create_table(
        'match_scores',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('match_percentage', sa.Float(), nullable=True),
        sa.Column('skill_similarity', sa.Float(), nullable=True),
        sa.Column('semantic_similarity', sa.Float(), nullable=True),
        sa.Column('experience_match', sa.Float(), nullable=True),
        sa.Column('talent_score_alignment', sa.Float(), nullable=True),
        sa.Column('project_relevance', sa.Float(), nullable=True),
        sa.Column('explanation', sa.Text(), nullable=True),
        sa.Column('computed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidate_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('job_id', 'candidate_id', name='uq_match_scores_job_candidate'),
    )
    op.create_index('idx_match_scores_job_time', 'match_scores', ['job_id', 'computed_at'], unique=False)

    op.create_table(
        'copilot_conversations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('recruiter_id', sa.UUID(), nullable=False),
        sa.Column('messages', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('structured_filters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recruiter_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'skill_taxonomy',
        sa.Column('canonical_name', sa.Text(), nullable=False),
        sa.Column('synonyms', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('canonical_name'),
    )

    op.create_table(
        'location_aliases',
        sa.Column('canonical_name', sa.Text(), nullable=False),
        sa.Column('aliases', postgresql.ARRAY(sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('canonical_name'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('location_aliases')
    op.drop_table('skill_taxonomy')
    op.drop_table('copilot_conversations')
    op.drop_index('idx_match_scores_job_time', table_name='match_scores')
    op.drop_table('match_scores')
    op.drop_index('idx_applications_candidate', table_name='applications')
    op.drop_index('idx_applications_job_stage', table_name='applications')
    op.drop_table('applications')
    op.drop_table('jobs')
