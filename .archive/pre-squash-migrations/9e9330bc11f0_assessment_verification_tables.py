"""assessment & verification tables (module 03)

Revision ID: 9e9330bc11f0
Revises: ac395e67db4e
Create Date: 2026-07-29 16:00:00.000000

Hand-written, mirroring the Module 02 migration's structure. `interview_sessions.
consent_id` is the sole consent reference (architecture doc's finalized schema — no
duplicate consent_given/consent_timestamp columns). `interview_reports.
response_confidence_signal` matches the architecture doc's renaming of SRS's
`confidence_score`. `contribution_reports.github_username` is additive (needed so a
team member who isn't yet a platform candidate can still appear in a report;
`candidate_id` stays nullable exactly as both docs' own SQL already has it).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9e9330bc11f0'
down_revision: Union[str, Sequence[str], None] = 'ac395e67db4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'assessments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=True),
        sa.Column('type', sa.Text(), nullable=False),
        sa.Column('spec', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("type IN ('coding','mcq','project_analysis')", name='ck_assessments_type'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'submissions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('assessment_id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('code_or_answers', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('test_results', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('static_analysis', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('llm_review', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidate_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_submissions_assessment', 'submissions', ['assessment_id'], unique=False)

    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=False),
        sa.Column('job_id', sa.UUID(), nullable=True),
        sa.Column('consent_id', sa.UUID(), nullable=False),
        sa.Column('status', sa.Text(), server_default='in_progress', nullable=False),
        sa.Column('state', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('in_progress','completed','abandoned')", name='ck_interview_sessions_status'
        ),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidate_profiles.id'], ),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['consent_id'], ['consents.consent_id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'interview_transcripts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('turn_index', sa.Integer(), nullable=False),
        sa.Column('role', sa.Text(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('ts', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.CheckConstraint("role IN ('agent','candidate')", name='ck_interview_transcripts_role'),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'idx_interview_transcripts_session_turn', 'interview_transcripts', ['session_id', 'turn_index'], unique=False
    )

    op.create_table(
        'interview_reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('response_confidence_signal', sa.Float(), nullable=True),
        sa.Column('technical_rating', sa.Float(), nullable=True),
        sa.Column('communication_rating', sa.Float(), nullable=True),
        sa.Column('hiring_recommendation', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['interview_sessions.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'contribution_reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('repo_full_name', sa.Text(), nullable=False),
        sa.Column('candidate_id', sa.UUID(), nullable=True),
        sa.Column('github_username', sa.Text(), nullable=True),
        sa.Column('contribution_share', sa.Float(), nullable=True),
        sa.Column('commits', sa.Integer(), nullable=True),
        sa.Column('lines_survived', sa.Integer(), nullable=True),
        sa.Column('prs_opened', sa.Integer(), nullable=True),
        sa.Column('prs_reviewed', sa.Integer(), nullable=True),
        sa.Column('anomaly_note', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['candidate_profiles.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_contribution_reports_repo', 'contribution_reports', ['repo_full_name'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('idx_contribution_reports_repo', table_name='contribution_reports')
    op.drop_table('contribution_reports')
    op.drop_table('interview_reports')
    op.drop_index('idx_interview_transcripts_session_turn', table_name='interview_transcripts')
    op.drop_table('interview_transcripts')
    op.drop_table('interview_sessions')
    op.drop_index('idx_submissions_assessment', table_name='submissions')
    op.drop_table('submissions')
    op.drop_table('assessments')
