"""Sync schema drift: fraud_detection_configs, hackathons.scoring_config,
interview_reports.rubric_scores.

Revision ID: o0p1q2r3s4t5
Revises: n9o0p1q2r3s4
Create Date: 2026-08-04 00:00:00.000000

These three schema objects existed in the SQLAlchemy models but had no migration
creating them, so they were only ever present on databases where they had been added
out-of-band. On a database built from scratch with `alembic upgrade head` they were
missing entirely, which broke seeding and any hackathon/interview-report/fraud-config
read path with UndefinedColumn/UndefinedTable errors.

Every step is guarded so this is safe to run against a database that already has them.
"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'o0p1q2r3s4t5'
down_revision: Union[str, Sequence[str], None] = 'n9o0p1q2r3s4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(inspector, table: str, column: str) -> bool:
    if not inspector.has_table(table):
        return False
    return any(c['name'] == column for c in inspector.get_columns(table))


def upgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if not _has_column(inspector, 'hackathons', 'scoring_config'):
        op.add_column(
            'hackathons',
            sa.Column('scoring_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        )

    if not _has_column(inspector, 'interview_reports', 'rubric_scores'):
        op.add_column(
            'interview_reports',
            sa.Column('rubric_scores', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        )

    if not inspector.has_table('fraud_detection_configs'):
        op.create_table(
            'fraud_detection_configs',
            sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column(
                'code_similarity_threshold', sa.Float(), server_default='0.75', nullable=False
            ),
            sa.Column(
                'text_similarity_threshold', sa.Float(), server_default='0.80', nullable=False
            ),
            sa.Column(
                'ocr_confidence_threshold', sa.Float(), server_default='0.55', nullable=False
            ),
            sa.Column('photo_hash_max_distance', sa.Float(), server_default='4', nullable=False),
            sa.Column(
                'ai_content_perplexity_threshold', sa.Float(), server_default='50', nullable=False
            ),
            sa.Column(
                'updated_at',
                sa.DateTime(timezone=True),
                server_default=sa.text('now()'),
                nullable=True,
            ),
            sa.ForeignKeyConstraint(['org_id'], ['organizations.id'], ),
            sa.PrimaryKeyConstraint('id'),
            sa.CheckConstraint(
                'code_similarity_threshold >= 0 AND code_similarity_threshold <= 1',
                name='ck_code_sim_range',
            ),
            sa.CheckConstraint(
                'text_similarity_threshold >= 0 AND text_similarity_threshold <= 1',
                name='ck_text_sim_range',
            ),
            sa.CheckConstraint(
                'ocr_confidence_threshold >= 0 AND ocr_confidence_threshold <= 1',
                name='ck_ocr_conf_range',
            ),
        )
        op.create_index(
            'idx_fraud_detection_configs_org', 'fraud_detection_configs', ['org_id'], unique=False
        )


def downgrade() -> None:
    inspector = sa.inspect(op.get_bind())

    if inspector.has_table('fraud_detection_configs'):
        op.drop_index('idx_fraud_detection_configs_org', table_name='fraud_detection_configs')
        op.drop_table('fraud_detection_configs')

    if _has_column(inspector, 'interview_reports', 'rubric_scores'):
        op.drop_column('interview_reports', 'rubric_scores')

    if _has_column(inspector, 'hackathons', 'scoring_config'):
        op.drop_column('hackathons', 'scoring_config')
