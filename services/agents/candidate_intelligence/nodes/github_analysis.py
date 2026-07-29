"""GitHub Analysis Agent — doc 01 §4. Node contract: constraints.md §2.3.

Returns only the keys it changes — see resume_parser.py's note on why (parallel fan-out).
"""

from services.agents.candidate_intelligence.state import CandidateProfileState
from services.agents.candidate_intelligence.tools.github import fetch_github_analysis


async def run(state: CandidateProfileState) -> dict:
    if not state.get("github_username"):
        return {}

    analysis = fetch_github_analysis(state["github_username"], state.get("github_access_token"))
    return {"github_raw": analysis}
