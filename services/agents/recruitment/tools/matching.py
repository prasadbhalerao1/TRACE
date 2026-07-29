"""Deterministic scoring primitives for FR-2 (AI Job Matching Engine). Plain functions,
no LLM, no I/O — same convention as candidate_intelligence's `mechanical_scores.py`.
Implements doc/multi-agent-architecture/08 §2's 4-term formula exactly:

    MatchScore = w1*SkillOverlap + w2*SemanticSimilarity + w3*ExperienceMatch + w4*TalentScoreAlignment

Weights below are the doc's explicitly-called-out "tunable default, not a validated
constant" — chosen and logged in .agents/decisions.md rather than silently picked, same
resolution style as Module 01's additive-but-undocumented schema choices.
"""

from dataclasses import dataclass

# doc 08 §2 canonical weights — tunable defaults, sum to 1.0.
W_SKILL_OVERLAP = 0.35
W_SEMANTIC_SIMILARITY = 0.30
W_EXPERIENCE_MATCH = 0.15
W_TALENT_SCORE_ALIGNMENT = 0.20

# Internal blend ratio for SemanticSimilarity = alpha*cos(v_C, v_J) + (1-alpha)*FilterMatchRatio.
SEMANTIC_ALPHA = 0.70


@dataclass
class CandidateSkillSignal:
    """A candidate's skill, tagged with how it was sourced — `verified` skills (GitHub
    repo language stats, verified certificates) count more than raw self-declared resume
    text, per doc 08 §2: "SkillOverlap weights verified signals ... to reduce
    keyword-stuffing." Mirrors the same anti-gaming intent as Module 01's Talent Score."""

    name: str
    verified: bool


def skill_overlap(candidate_skills: list[CandidateSkillSignal], required_skills: list[str]) -> float:
    """0-100. Each required skill present (case-insensitive) in the candidate's skill
    list contributes to the overlap ratio; a `verified` match contributes a full point,
    an unverified (self-declared) match contributes a discounted 0.6 point — this is
    what makes resume keyword-stuffing score lower than the same skill backed by an
    actual GitHub repo or verified certificate."""
    if not required_skills:
        return 0.0
    candidate_by_name = {s.name.lower(): s.verified for s in candidate_skills}
    earned = 0.0
    for required in required_skills:
        verified = candidate_by_name.get(required.lower())
        if verified is True:
            earned += 1.0
        elif verified is False:
            earned += 0.6
    return round(100.0 * earned / len(required_skills), 1)


def experience_match(candidate_years: float | None, min_experience_years: int | None) -> float | None:
    """0-100. `None` (never 0) when the job has no stated minimum — an unconstrained job
    isn't a bad experience match, it's an inapplicable one, and the aggregation step must
    re-normalize around it rather than punish every candidate equally."""
    if min_experience_years is None or min_experience_years <= 0:
        return None
    if candidate_years is None:
        return 0.0
    ratio = candidate_years / min_experience_years
    # Meeting the bar is full credit; exceeding it doesn't keep climbing forever (a 20-year
    # veteran isn't a "200% match" for a 2-year-minimum role) but isn't penalized either.
    return round(100.0 * min(ratio, 1.0), 1)


def talent_score_alignment(candidate_overall_talent_score: float | None) -> float | None:
    """0-100, a direct passthrough of the candidate's own Module 01 Talent Score — `None`
    (cold start, no fabricated number) when the candidate has none yet, same convention
    as every Module 01 sub-score."""
    if candidate_overall_talent_score is None:
        return None
    return round(max(0.0, min(100.0, candidate_overall_talent_score)), 1)


def filter_match_ratio(
    candidate_location: str | None,
    job_location: str | None,
    job_is_remote: bool,
) -> float:
    """0-1. The FilterMatchRatio half of SemanticSimilarity's blend (doc 08 §2) — how many
    of the job's hard filters (right now: location/remote) the candidate satisfies."""
    if job_is_remote:
        return 1.0
    if not job_location:
        return 1.0
    if not candidate_location:
        return 0.5  # unknown, not a hard fail
    return 1.0 if candidate_location.strip().lower() == job_location.strip().lower() else 0.0


def semantic_similarity(cosine_similarity: float, filter_match_ratio_value: float) -> float:
    """0-100. `cosine_similarity` is expected in [-1, 1] from the embedding comparison;
    clamped to [0, 1] before blending since a negative cosine isn't a meaningful "match
    quality" signal here."""
    cos = max(0.0, min(1.0, cosine_similarity))
    blended = SEMANTIC_ALPHA * cos + (1 - SEMANTIC_ALPHA) * filter_match_ratio_value
    return round(100.0 * blended, 1)


def aggregate_match_score(
    skill_overlap_value: float,
    semantic_similarity_value: float,
    experience_match_value: float | None,
    talent_score_alignment_value: float | None,
) -> float:
    """The 4-term weighted sum, re-normalized (same technique as doc 08 §1.1's Talent
    Score cold-start handling) when experience_match or talent_score_alignment is `None`
    — their weight is redistributed proportionally across whichever terms ARE available,
    never silently treated as a zero score."""
    terms = [
        (W_SKILL_OVERLAP, skill_overlap_value),
        (W_SEMANTIC_SIMILARITY, semantic_similarity_value),
        (W_EXPERIENCE_MATCH, experience_match_value),
        (W_TALENT_SCORE_ALIGNMENT, talent_score_alignment_value),
    ]
    available = [(w, v) for w, v in terms if v is not None]
    total_weight = sum(w for w, _ in available)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum(w * v for w, v in available)
    return round(weighted_sum / total_weight, 1)
