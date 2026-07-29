"""Aggregation Agent — doc 08 §7's canonical, explicit formula:

    OverallPitchScore = 0.25*Innovation + 0.25*TechnicalFeasibility
                       + 0.25*PresentationQuality + 0.25*BusinessPotential

Equal-weighted, rules-based (not an LLM call). Cold-start re-normalization follows the
exact same pattern as Talent Score's doc 08 §1.1 (candidate_intelligence/tools/aggregate.py)
— any component that's `None` (LLM scoring unavailable, no data) has its weight zeroed
and the rest re-normalized, rather than penalizing a deck for a missing sub-score.
"""

from packages.shared_schemas.presentations import PITCH_SCORE_NAMES

_EQUAL_WEIGHT = 0.25


def compute_overall_pitch_score(scores: dict[str, float | None]) -> tuple[float | None, list[str]]:
    """Returns (overall_score, names_of_components_that_were_renormalized_away)."""
    available = {name: value for name, value in scores.items() if value is not None}
    missing = [name for name in PITCH_SCORE_NAMES if name not in available]

    if not available:
        return None, missing

    weight_sum = _EQUAL_WEIGHT * len(available)
    overall = sum(_EQUAL_WEIGHT * value for value in available.values()) / weight_sum
    return round(overall, 1), missing
