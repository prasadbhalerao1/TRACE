"""Talent Scoring Agent — doc 01 §4/§6, formula in doc 08 §1.

Sonnet for Project Quality & Innovation (judgment calls); rules for the rest — this
node computes all 7 the same way the doc's agent registry describes, just without a
separate LLM call wrapper per sub-score (the LLM calls live inside the judgment tools).
"""

from packages.shared_schemas.candidates import SubScore
from services.agents.candidate_intelligence.state import CandidateProfileState
from services.agents.candidate_intelligence.tools import mechanical_scores
from services.agents.candidate_intelligence.tools.aggregate import compute_overall
from services.agents.candidate_intelligence.tools.github import GithubAnalysis
from services.agents.candidate_intelligence.tools.judgment_scores import (
    innovation,
    project_quality,
)


async def run(state: CandidateProfileState) -> dict:
    github_raw: GithubAnalysis | None = state.get("github_raw")
    empty = GithubAnalysis()
    analysis = github_raw or empty

    sub_scores = {
        "coding_ability": mechanical_scores.coding_ability(analysis),
        "problem_solving": mechanical_scores.problem_solving(),
        "technical_consistency": mechanical_scores.technical_consistency(analysis),
        "community_participation": mechanical_scores.community_participation(analysis),
        "leadership": mechanical_scores.leadership(analysis),
        "project_quality": (
            project_quality(state["github_username"], state.get("github_access_token"), analysis)
            if github_raw is not None
            else SubScore(value=None, rationale="No GitHub data ingested yet.")
        ),
        "innovation": (
            innovation(state["candidate_id"], analysis)
            if github_raw is not None
            else SubScore(value=None, rationale="No GitHub data ingested yet.")
        ),
    }

    overall, renormalized = compute_overall(sub_scores)

    return {
        "sub_scores": sub_scores,
        "overall_score": overall,
        "renormalized_subscores": renormalized,
    }
