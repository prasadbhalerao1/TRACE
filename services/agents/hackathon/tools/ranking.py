"""Ranking Aggregation Agent's formula — doc 05 §4 / doc 08 §8. Rules only, transparent
weighted formula. Weights are now configurable per hackathon via `Hackathon.scoring_config`
(JSONB dict). Defaults to judge:0.40, pitch:0.30, repo:0.20, novelty:0.10 if not configured.
Cold-start re-normalization mirrors doc 08 §1.1's exact pattern (already used by
`candidate_intelligence/tools/aggregate.py` for the Talent Score and by every other module's
"component may not exist yet" formula) — a component that doesn't exist for this event/team
has its weight zeroed and the rest re-normalized, never silently zero-filled.
"""

from services.agents.common.scoring import weighted_renormalized_mean

_DEFAULT_WEIGHTS = {
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
    weights: dict | None = None,
) -> tuple[float | None, dict]:
    """All four inputs are expected on a 0-100 scale (`judge_score` is whatever scale the
    organizer/judge used — normalized to 0-100 by the caller before this function sees
    it, per the doc's own `norm(JudgeScore)` term). `weights` is an optional dict of
    {component_name: weight} — if None, uses _DEFAULT_WEIGHTS. Returns `(composite_score, breakdown)`
    where `breakdown` always lists every component's raw value plus which ones were
    re-normalized away, so the score is never presented as a bare number (doc 08/09's
    "always shown with evidence" NFR, extended to hackathon rankings)."""
    if weights is None:
        weights = _DEFAULT_WEIGHTS

    components = {
        "judge_score_component": judge_score,
        "pitch_score_component": pitch_score,
        "repo_quality_component": repo_score,
        "novelty_component": novelty_score,
    }
    available = {k: v for k, v in components.items() if v is not None}
    renormalized = [k for k in weights if k not in available]

    breakdown = {
        "judge_score": judge_score,
        "pitch_score": pitch_score,
        "repo_quality_score": repo_score,
        "novelty_score": novelty_score,
        "renormalized": renormalized,
    }

    composite = weighted_renormalized_mean([(weights[k], v) for k, v in available.items()])
    if composite is None:
        return None, breakdown
    return round(composite, 2), breakdown
