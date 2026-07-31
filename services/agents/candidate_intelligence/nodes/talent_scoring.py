"""Talent Scoring Agent — doc 01 §4/§6, formula in doc 08 §1, v2 robustness pass.

Sonnet for Project Quality & Innovation (judgment calls); rules for the rest — this
node computes all 7 the same way the doc's agent registry describes, just without a
separate LLM call wrapper per sub-score (the LLM calls live inside the judgment tools).

Population/assessment data is injected via state (fetched by the router, which owns the
DB session) rather than queried here — this node stays DB-free, same convention as the
rest of candidate_intelligence.
"""

import asyncio

from packages.shared_schemas.candidates import SubScore
from services.agents.candidate_intelligence.state import CandidateProfileState
from services.agents.candidate_intelligence.tools import mechanical_scores
from services.agents.candidate_intelligence.tools.aggregate import compute_confidence, compute_overall
from services.agents.candidate_intelligence.tools.github import GithubAnalysis
from services.agents.candidate_intelligence.tools.judgment_scores import (
    code_quality_score,
    innovation,
    project_quality,
)


async def run(state: CandidateProfileState) -> dict:
    github_raw: GithubAnalysis | None = state.get("github_raw")
    empty = GithubAnalysis()
    analysis = github_raw or empty

    assessment_score = state.get("assessment_score")
    assessment_population = state.get("assessment_population") or []

    # code_quality_score samples source files via blocking PyGithub calls — same
    # rationale as github_analysis.py's node: run off-thread so it doesn't stall the
    # event loop for every other in-flight request.
    quality_score, _ = (
        await asyncio.to_thread(
            code_quality_score, state["github_username"], state.get("github_access_token"), analysis
        )
        if github_raw is not None
        else (None, [])
    )

    sub_scores = {
        "coding_ability": mechanical_scores.coding_ability(
            analysis,
            commit_population=state.get("commit_population") or [],
            quality_score=quality_score,
            assessment_score=assessment_score,
            assessment_population=assessment_population,
        ),
        "problem_solving": mechanical_scores.problem_solving(assessment_score, assessment_population),
        "technical_consistency": mechanical_scores.technical_consistency(analysis),
        "community_participation": mechanical_scores.community_participation(
            analysis, star_population=state.get("star_population") or []
        ),
        "leadership": mechanical_scores.leadership(
            analysis, leadership_population=state.get("leadership_population") or []
        ),
        "project_quality": (
            await project_quality(state["github_username"], state.get("github_access_token"), analysis)
            if github_raw is not None
            else SubScore(value=None, rationale="No GitHub data ingested yet.")
        ),
        "innovation": (
            await innovation(state["candidate_id"], analysis)
            if github_raw is not None
            else SubScore(value=None, rationale="No GitHub data ingested yet.")
        ),
    }

    overall, renormalized = compute_overall(sub_scores)
    confidence = compute_confidence(sub_scores)

    return {
        "sub_scores": sub_scores,
        "overall_score": overall,
        "renormalized_subscores": renormalized,
        "confidence": confidence,
    }
