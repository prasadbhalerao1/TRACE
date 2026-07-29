"""Ranking Aggregation Agent's formula — doc 05 §4 / doc 08 §8. Rules only, transparent
weighted formula, tunable defaults per the doc's own "not every hackathon has manual
judges" note. Cold-start re-normalization mirrors doc 08 §1.1's exact pattern (already
used by `candidate_intelligence/tools/aggregate.py` for the Talent Score and by every
other module's "component may not exist yet" formula) — a component that doesn't exist
for this event/team has its weight zeroed and the rest re-normalized, never silently
zero-filled.
"""

_WEIGHTS = {
    "judge_score_component": 0.40,
    "pitch_score_component": 0.30,
    "repo_quality_component": 0.20,
    "novelty_component": 0.10,
}


def compute_composite_score(
    judge_score: float | None,
    pitch_score: float | None,
    repo_score: float | None,
    novelty_score: float | None,
) -> tuple[float | None, dict]:
    """All four inputs are expected on a 0-100 scale (`judge_score` is whatever scale the
    organizer/judge used — normalized to 0-100 by the caller before this function sees
    it, per the doc's own `norm(JudgeScore)` term). Returns `(composite_score, breakdown)`
    where `breakdown` always lists every component's raw value plus which ones were
    re-normalized away, so the score is never presented as a bare number (doc 08/09's
    "always shown with evidence" NFR, extended to hackathon rankings)."""
    components = {
        "judge_score_component": judge_score,
        "pitch_score_component": pitch_score,
        "repo_quality_component": repo_score,
        "novelty_component": novelty_score,
    }
    available = {k: v for k, v in components.items() if v is not None}
    renormalized = [k for k in _WEIGHTS if k not in available]

    breakdown = {
        "judge_score": judge_score,
        "pitch_score": pitch_score,
        "repo_quality_score": repo_score,
        "novelty_score": novelty_score,
        "renormalized": renormalized,
    }

    if not available:
        return None, breakdown

    weight_sum = sum(_WEIGHTS[k] for k in available)
    composite = sum(_WEIGHTS[k] * available[k] for k in available) / weight_sum
    return round(composite, 2), breakdown
