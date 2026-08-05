"""Add candidate_profiles.ingestion_stage for stepwise ingestion progress.

Revision ID: t5u6v7w8x9y0
Revises: s4t5u6v7w8x9
Create Date: 2026-08-05 00:00:00.000000

`ingestion_status` only distinguishes idle/processing/done/failed. A full ingestion run
(resume parse -> GitHub crawl -> certificate OCR -> Talent Score -> badges) takes minutes
on a large GitHub account, and during all of it the UI could say nothing more specific
than "analyzing…", which reads as a frozen page.

This column records which phase is currently running so the client can show real,
advancing progress. Nullable with no default: an idle profile has no stage, and existing
rows need no backfill.

Guarded with IF NOT EXISTS, matching the convention in o0p1q2r3s4t5.
"""
from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 't5u6v7w8x9y0'
down_revision: Union[str, Sequence[str], None] = 's4t5u6v7w8x9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE candidate_profiles ADD COLUMN IF NOT EXISTS ingestion_stage TEXT")


def downgrade() -> None:
    op.execute("ALTER TABLE candidate_profiles DROP COLUMN IF EXISTS ingestion_stage")
