"""Async ingestion/matching status columns + missing FK/filter indexes.

Resume/certificate/GitHub-OAuth ingestion and job matching moved from inline synchronous
request handling to FastAPI BackgroundTasks (both were blocking the event loop and doing
full-table candidate-pool scans on every request). `ingestion_status`/`matching_status`
let the frontend poll for completion instead of the endpoint blocking until done.

Also adds indexes on every FK/filter column that lacked one — confirmed via grep that
zero of ~339 mapped columns had index=True. These are read on nearly every dashboard,
matching, and pipeline request as candidate/job counts grow.

Revision ID: j5k6l7m8n9o0
Revises: i4j5k6l7m8n9
Create Date: 2026-07-31 00:00:00.000000
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'j5k6l7m8n9o0'
down_revision: Union[str, Sequence[str], None] = 'i4j5k6l7m8n9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'candidate_profiles',
        sa.Column('ingestion_status', sa.Text(), nullable=False, server_default='idle'),
    )
    op.add_column('candidate_profiles', sa.Column('ingestion_error', sa.Text(), nullable=True))
    op.add_column(
        'jobs', sa.Column('matching_status', sa.Text(), nullable=False, server_default='idle')
    )
    op.add_column('jobs', sa.Column('matching_error', sa.Text(), nullable=True))

    op.create_index('idx_candidate_profiles_user_id', 'candidate_profiles', ['user_id'], unique=False)
    op.create_index('idx_github_snapshots_candidate_id', 'github_snapshots', ['candidate_id'], unique=False)
    op.create_index('idx_certifications_candidate_id', 'certifications', ['candidate_id'], unique=False)
    op.create_index('idx_badges_candidate_id', 'badges', ['candidate_id'], unique=False)
    op.create_index(
        'idx_generated_documents_candidate_id', 'generated_documents', ['candidate_id'], unique=False
    )
    op.create_index(
        'idx_career_recommendations_candidate_id', 'career_recommendations', ['candidate_id'], unique=False
    )
    op.create_index('idx_jobs_posted_by_user_id', 'jobs', ['posted_by_user_id'], unique=False)
    op.create_index('idx_jobs_organization_id', 'jobs', ['organization_id'], unique=False)
    op.create_index(
        'idx_match_scores_candidate_id', 'match_scores', ['candidate_id'], unique=False
    )
    op.create_index(
        'idx_copilot_conversations_recruiter_id', 'copilot_conversations', ['recruiter_id'], unique=False
    )


def downgrade() -> None:
    op.drop_index('idx_copilot_conversations_recruiter_id', table_name='copilot_conversations')
    op.drop_index('idx_match_scores_candidate_id', table_name='match_scores')
    op.drop_index('idx_jobs_organization_id', table_name='jobs')
    op.drop_index('idx_jobs_posted_by_user_id', table_name='jobs')
    op.drop_index('idx_career_recommendations_candidate_id', table_name='career_recommendations')
    op.drop_index('idx_generated_documents_candidate_id', table_name='generated_documents')
    op.drop_index('idx_badges_candidate_id', table_name='badges')
    op.drop_index('idx_certifications_candidate_id', table_name='certifications')
    op.drop_index('idx_github_snapshots_candidate_id', table_name='github_snapshots')
    op.drop_index('idx_candidate_profiles_user_id', table_name='candidate_profiles')

    op.drop_column('jobs', 'matching_error')
    op.drop_column('jobs', 'matching_status')
    op.drop_column('candidate_profiles', 'ingestion_error')
    op.drop_column('candidate_profiles', 'ingestion_status')
