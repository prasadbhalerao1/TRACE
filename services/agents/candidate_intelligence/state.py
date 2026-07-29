import operator
from typing import Annotated, Any, Optional, TypedDict

from packages.shared_schemas.candidates import SubScore


class CandidateProfileState(TypedDict):
    candidate_id: str
    user_id: str

    # Resume ingestion (in, then out)
    raw_resume_bytes: Optional[bytes]
    raw_resume_content_type: Optional[str]
    resume_parsed: Optional[dict]

    # GitHub ingestion (in, then out)
    github_username: Optional[str]
    github_access_token: Optional[str]  # transient, per FR-1.1 — never persisted
    github_raw: Optional[Any]  # GithubAnalysis dataclass while the graph is running

    # Certificate ingestion (in, then out)
    certificate_file_bytes: Optional[bytes]
    certificate_extracted: Optional[dict]

    # Merge output
    merged_profile: Optional[dict]
    # resume_parser, certificate_ocr, and profile_merge can each contribute conflicts in
    # the same superstep (parallel fan-out) — needs a reducer so concurrent partial
    # writes concatenate instead of colliding (langgraph's default channel only accepts
    # one write per step). Node functions must return only their OWN new entries here,
    # never the accumulated list, since the reducer does the accumulating.
    conflicts: Annotated[list[str], operator.add]

    # Scoring output
    sub_scores: dict[str, SubScore]
    overall_score: Optional[float]
    renormalized_subscores: list[str]

    # Badge output
    badges: list[dict]
