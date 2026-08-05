"""Index the foreign keys that hot read paths filter on.

Revision ID: s4t5u6v7w8x9
Revises: r3s4t5u6v7w8
Create Date: 2026-08-05 00:00:00.000000

Postgres creates an index for a PRIMARY KEY and for UNIQUE, but never for a plain
FOREIGN KEY. A survey of the live schema found 24 unindexed FK columns; this migration
covers the seven that application code actually filters or joins on. The rest are left
alone deliberately — an index that no query uses still has to be maintained on every
INSERT/UPDATE and still consumes cache, so indexing all 24 would trade read latency we
don't gain for write throughput we do lose.

Why each one:

- `consents.candidate_id` — read on every AI-interview start and every ingestion consent
  check, ordered by `granted_at DESC`. Made composite `(candidate_id, granted_at DESC)`
  so the "latest granted consent" lookup is an index scan that stops at the first row
  instead of sorting every consent the candidate has ever given. This is on the path the
  user reported as freezing.
- `interview_reports.session_id` — read whenever a report is fetched or checked for
  existence, including once per attempt in the recruiter's attempts list.
- `interview_sessions.interview_definition_id` — the recruiter attempts list filters the
  whole interview_sessions table by it.
- `hackathon_rankings.team_id` — joined per team when rankings are read and rewritten on
  every finalization.
- `hackathon_team_members.candidate_id` — reverse lookup ("which teams is this candidate
  on") for the candidate hackathon view.
- `plagiarism_matches.presentation_id` — read on every deck detail view.
- `files.owner_user_id` — `_latest_photo_files` IN-filters it across a whole user set for
  the fraud photo corpus; unindexed that is a sequential scan of every file row.

Guarded with IF NOT EXISTS, matching the convention in o0p1q2r3s4t5 / p1q2r3s4t5u6.
"""
from collections.abc import Sequence
from typing import Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 's4t5u6v7w8x9'
down_revision: Union[str, Sequence[str], None] = 'r3s4t5u6v7w8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (index_name, table, column_expression)
_INDEXES = [
    # Composite + DESC: the query is "latest granted consent for this candidate".
    ("idx_consents_candidate_granted", "consents", "candidate_id, granted_at DESC"),
    ("idx_interview_reports_session", "interview_reports", "session_id"),
    ("idx_interview_sessions_definition", "interview_sessions", "interview_definition_id"),
    ("idx_hackathon_rankings_team", "hackathon_rankings", "team_id"),
    ("idx_hackathon_team_members_candidate", "hackathon_team_members", "candidate_id"),
    ("idx_plagiarism_matches_presentation", "plagiarism_matches", "presentation_id"),
    # Composite in the exact filter+sort order `_latest_photo_files` uses, so the index
    # serves the IN-filter, the file_type equality, and the ORDER BY together.
    ("idx_files_owner_type_uploaded", "files", "owner_user_id, file_type, uploaded_at DESC"),
]


def upgrade() -> None:
    for name, table, columns in _INDEXES:
        op.execute(f"CREATE INDEX IF NOT EXISTS {name} ON {table} ({columns})")


def downgrade() -> None:
    for name, _table, _columns in reversed(_INDEXES):
        op.execute(f"DROP INDEX IF EXISTS {name}")
