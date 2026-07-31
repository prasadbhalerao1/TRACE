"""Trusted issuers registry (Module 06 fraud engine).

Replaces the hardcoded `_ISSUER_VERIFY_URL_TEMPLATES` dict in
`services/agents/fraud/tools/issuer_lookup.py` with a real, admin-manageable table, and
seeds it with the same 6 issuers that dict already covered so certificate verification
behavior doesn't regress on deploy. An issuer NOT in this table is now an explicit
"unrecognized issuer" fraud signal (see cert_verdict.py) instead of silently falling
through to Visual Forensics as if that were an equally strong verification path.

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
Create Date: 2026-07-31 00:00:00.000000
"""
import uuid
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision: str = 'l7m8n9o0p1q2'
down_revision: Union[str, Sequence[str], None] = 'k6l7m8n9o0p1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_SEED_ISSUERS = [
    ("Coursera", ["coursera"], "https://www.coursera.org/verify/{credential_id}", "platform"),
    ("freeCodeCamp", ["freecodecamp"], "https://www.freecodecamp.org/certification/{credential_id}", "platform"),
    ("AWS", ["aws", "amazon web services"], "https://cp.certmetrics.com/amazon/en/public/verify/credential/{credential_id}", "platform"),
    ("Credly", ["credly"], "https://www.credly.com/badges/{credential_id}", "platform"),
    ("Udemy", ["udemy"], "https://www.udemy.com/certificate/{credential_id}", "platform"),
    ("HackerRank", ["hackerrank"], "https://www.hackerrank.com/certificates/{credential_id}", "platform"),
]


def upgrade() -> None:
    op.create_table(
        'trusted_issuers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('aliases', JSONB(), nullable=True),
        sa.Column('verification_url_template', sa.Text(), nullable=True),
        sa.Column('trust_tier', sa.Text(), nullable=False, server_default='platform'),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('added_by_user_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "trust_tier IN ('platform','university','employer','community')",
            name='ck_trusted_issuers_trust_tier',
        ),
        sa.UniqueConstraint('name', name='uq_trusted_issuers_name'),
    )

    issuers_table = sa.table(
        'trusted_issuers',
        sa.column('id', UUID(as_uuid=True)),
        sa.column('name', sa.Text()),
        sa.column('aliases', JSONB()),
        sa.column('verification_url_template', sa.Text()),
        sa.column('trust_tier', sa.Text()),
    )
    op.bulk_insert(
        issuers_table,
        [
            {
                'id': uuid.uuid4(),
                'name': name,
                'aliases': aliases,
                'verification_url_template': template,
                'trust_tier': tier,
            }
            for name, aliases, template, tier in _SEED_ISSUERS
        ],
    )


def downgrade() -> None:
    op.drop_table('trusted_issuers')
