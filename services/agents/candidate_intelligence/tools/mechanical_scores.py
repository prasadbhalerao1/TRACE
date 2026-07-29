"""Fully mechanical sub-scores — rules only, no LLM (doc 01 §4 model-routing table).

Coding Ability, Technical Consistency, Community Participation, and Leadership are
computed for real from GitHub data alone here. Problem Solving depends entirely on
Module 3 (Assessment/Verification) results, which don't exist yet in this build — it's
always `None` (cold start), not a fabricated placeholder.
"""

import math

from packages.shared_schemas.candidates import SubScore
from services.agents.candidate_intelligence.tools.github import (
    GithubAnalysis,
    commit_consistency_score,
)


def coding_ability(analysis: GithubAnalysis) -> SubScore:
    if not analysis.repos:
        return SubScore(value=None, rationale="No GitHub repos found — cold start.")

    total_commits = sum(r.commit_count for r in analysis.repos if not r.is_fork)
    # Log-scale so a handful of high-volume repos don't dominate (doc 08 §1: "log-scaled
    # commit frequency"). 200 own commits ~= a strong signal; scaled to land near 80-90.
    value = min(100.0, 100.0 * math.log1p(total_commits) / math.log1p(200))
    return SubScore(
        value=round(value, 1),
        evidence=[r.repo_full_name for r in analysis.repos if not r.is_fork][:10],
        rationale=(
            f"{total_commits} commits across {analysis.owned_repo_count} owned repos "
            "(doc 03 assessment pass-rate component not yet available — GitHub signal only)."
        ),
    )


def technical_consistency(analysis: GithubAnalysis) -> SubScore:
    score = commit_consistency_score(analysis.commit_activity_weekly)
    if score is None:
        return SubScore(value=None, rationale="Not enough weekly commit history yet.")
    return SubScore(
        value=round(score, 1),
        rationale="Inverse coefficient of variation over the last 52 weeks of commit activity.",
    )


def community_participation(analysis: GithubAnalysis) -> SubScore:
    if not analysis.repos and analysis.external_contributions == 0:
        return SubScore(value=None, rationale="No GitHub activity found — cold start.")
    # Stars (log-scaled) + external OSS contributions; hackathon participation count
    # (doc 05) isn't available yet — that term is simply omitted, not zero-filled.
    star_component = min(60.0, 60.0 * math.log1p(analysis.total_stars) / math.log1p(100))
    contrib_component = min(40.0, analysis.external_contributions * 8.0)
    value = star_component + contrib_component
    return SubScore(
        value=round(value, 1),
        rationale=(
            f"{analysis.total_stars} total stars, {analysis.external_contributions} "
            "external merged PRs (hackathon participation count not yet available)."
        ),
    )


def leadership(analysis: GithubAnalysis) -> SubScore:
    if analysis.owned_repo_count == 0 and analysis.pr_review_count == 0:
        return SubScore(value=None, rationale="No maintainer or PR-review signal yet.")
    # Weakest, most gameable signal (doc 08 §1 practical note) — kept low-weight upstream
    # and always shown with its inputs, never hidden as a bare number.
    maintainer_component = min(50.0, analysis.owned_repo_count * 10.0)
    review_component = min(50.0, analysis.pr_review_count * 5.0)
    value = maintainer_component + review_component
    return SubScore(
        value=round(value, 1),
        rationale=(
            f"Owns/maintains {analysis.owned_repo_count} non-fork repos, "
            f"{analysis.pr_review_count} PR reviews found (team-lead flag from doc 03 not yet available)."
        ),
    )


def problem_solving() -> SubScore:
    return SubScore(
        value=None,
        rationale="Depends entirely on Module 3 (Assessment/Verification) results, not yet built.",
    )
