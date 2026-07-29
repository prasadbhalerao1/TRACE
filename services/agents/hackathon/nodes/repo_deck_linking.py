"""Repo/Deck Linking Agent — doc 05 §4, "rules" tier, "validates/dedupes references,
triggers async invocation of doc 03/04 pipelines."

Decks are NOT re-scored here: a team's deck is uploaded through Module 04's own real
`POST /presentations/upload` endpoint before/at hackathon submission time, so
`presentation_scores` already exists by the time rankings are finalized — the router
pre-fetches `pitch_score` (a plain table read) and this node just passes it through.

Repos ARE actively triggered here, since a hackathon repo link never goes through Module
03's own coding-assessment UI — this node invokes Module 03's real, unmodified
verification graph (`get_verification_graph()`, the exact entrypoint
`services/api/routers/assessments.py` itself calls) for any team whose repo hasn't been
scored yet. Reuses `_fetch_repo_sample_source` from that same router rather than
duplicating the GitHub-fetch logic.

Node stays DB-free (this codebase's universal convention — router fetches/persists,
nodes stay pure): the freshly-computed `repo_verification_results` are handed back in
state for the router to persist as real `Assessment`/`Submission` rows after this graph
completes, exactly like every other cross-module write in this codebase.
"""

from services.agents.assessment.state import VerificationState
from services.agents.assessment.tools.llm_review import AssessmentUnavailable
from services.agents.assessment.verification_graph import get_verification_graph
from services.agents.hackathon.state import HackathonRankingState
from services.api.routers.assessments import _fetch_repo_sample_source


def _repo_full_name(repo_url: str) -> str:
    if "github.com/" in repo_url:
        return repo_url.rstrip("/").split("github.com/")[-1]
    return repo_url


async def _score_repo(repo_url: str) -> dict:
    repo_full_name = _repo_full_name(repo_url)
    source = _fetch_repo_sample_source(repo_full_name)

    initial_state: VerificationState = {
        "assessment_type": "project_analysis",
        "spec": {},
        "code_or_answers": {"repo_full_name": repo_full_name, "code": source},
        "test_results": [],
        "static_analysis": {},
        "tests_passed": 0,
        "tests_total": 0,
        "grading_rationale": None,
        "llm_review": None,
        "score": None,
    }
    result_state = await get_verification_graph().ainvoke(initial_state)
    return {
        "repo_full_name": repo_full_name,
        "static_analysis": result_state["static_analysis"],
        "llm_review": result_state["llm_review"],
        "score": result_state["score"],
    }


async def run(state: HackathonRankingState) -> dict:
    repo_scores: dict[str, float | None] = {}
    repo_verification_results: dict[str, dict] = {}

    for team in state["teams"]:
        team_id = team["team_id"]
        existing_repo_score = team.get("repo_score")
        if existing_repo_score is not None:
            repo_scores[team_id] = existing_repo_score
            continue
        if not team.get("repo_url"):
            repo_scores[team_id] = None
            continue
        try:
            result = await _score_repo(team["repo_url"])
            repo_scores[team_id] = result["score"]
            repo_verification_results[team_id] = result
        except AssessmentUnavailable:
            # Static analysis ran (it's pure Python, no external dependency) but the LLM
            # code review couldn't (e.g. missing ANTHROPIC_API_KEY) — degrade to None,
            # never fabricate a repo quality number, same pattern every other module uses.
            repo_scores[team_id] = None

    return {"repo_scores": repo_scores, "repo_verification_results": repo_verification_results}
