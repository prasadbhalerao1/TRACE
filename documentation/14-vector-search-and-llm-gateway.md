# Vector Search & LLM Gateway (Shared AI Infrastructure)

## What this infrastructure does

The "AI plumbing" every feature builds on: Qdrant vector database for semantic search, SentenceTransformer embeddings, and a multi-provider LLM gateway abstracting OpenAI/Anthropic/Groq.

## The Qdrant vector database layer

Every Qdrant collection:

| Collection | Purpose | Stored | Indexed |
|---|---|---|---|
| `candidate_skills` | Job matching candidate pool | Candidate skill vectors | skill embeddings |
| `job_skills` | Job matching job requirements | Job skill vectors | skill embeddings |
| `novelty_corpus` | Hackathon solution uniqueness | Prior hackathon solution summaries | novelty embeddings |
| `plagiarism_decks` | Pitch deck plagiarism detection | Deck slide text vectors | deck embeddings |
| `plagiarism_code` | Code submission plagiarism | Code token fingerprints | code embeddings |
| `skill_taxonomy` | Career guidance role requirements | Role → skills vectors | role embeddings |

**Key Finding**: The "bare skill-name vs described-skill embedding" discovery.

```
Problem: Bare skill embeddings are ambiguous
    "Vue.js" embed:  [0.12, 0.34, ...]
    "React" embed:   [0.11, 0.35, ...]
    "Photoshop" embed: [0.13, 0.33, ...]
    
    Cosine similarity (bare):
    - Vue.js ↔ React:     0.65
    - Photoshop ↔ React:  0.64  ← Same! They're indistinguishable!

Solution: Add one-sentence descriptions to each skill
    "Vue.js: a progressive JavaScript frontend framework..."
    "React: a JavaScript library for building UIs..."
    "Photoshop: raster graphics editing software..."
    
    Cosine similarity (described):
    - Vue.js ↔ React:     0.89  ← Good! Related frameworks
    - Photoshop ↔ React:  0.66  ← Good! Clearly unrelated
```

**Where this is used**:
- Job matching: `best_skill_similarity()` compares described skills
- Skill gap analysis: same embeddings for role requirements
- Hard-filter fallback: when exact skill match fails

## The multi-provider LLM gateway

```
services/api/core/llm.py

Provider Configuration (in .env):
    LLM_PROVIDER=anthropic          # or openai, groq, gemini
    LLM_MODEL_FAST=claude-opus-4    # Fast tier (low-latency responses)
    LLM_MODEL_JUDGMENT=claude-opus-5 # Judgment tier (high-quality reasoning)

Example Usage:
    from services.api.core.llm import call_llm
    
    result = call_llm(
        prompt="Grade this code: ...",
        model="judgment",            # Uses LLM_MODEL_JUDGMENT
        temperature=0,
        max_tokens=1000,
        provider_override=None,      # Use default provider
    )
```

**Why split fast/judgment tiers?**

```
Fast-tier use (low-latency, lower-cost):
    - Resume generation drafts
    - Interview turn evaluation (must feel responsive)
    - Query understanding (just parse user intent)
    Cost: ~$0.001 per call

Judgment-tier use (higher quality):
    - Code review (nuanced feedback)
    - Pitch deck rubric scoring (important decision)
    - Final hiring recommendation
    Cost: ~$0.01 per call

Why separate? Budget constraints + UX.
    - A slow resume generation (30sec) is acceptable
    - A slow turn-by-turn interview evaluation (30sec per turn) is not
    - Judgment-tier is 3-5x slower; reserve for decisions
```

## The shared scoring aggregation helper

```
services/agents/common/scoring.py::weighted_renormalized_mean()

Problem: 5 separate implementations of "weighted sum with cold-start"
    - Talent Score (candidate_intelligence/tools/aggregate.py)
    - Pitch Score (hackathon/tools/ranking.py)
    - Job Matching (recruitment/tools/matching.py)
    - Coding Ability (assessment/tools/coding_score.py)
    - Mechanical Scores (candidate_intelligence/tools/mechanical_scores.py)

All 5 did the same thing:
    if missing_term: skip it
    renormalize remaining weights to sum to 1.0
    return weighted average

Solution: One function, called by all 5
    weighted_renormalized_mean([
        (0.40, judge_score or None),
        (0.30, pitch_score or None),
        (0.20, repo_score or None),
        (0.10, novelty_score or None),
    ])
    
    Returns: numeric score (never 0 or "unknown" as fallback)
    Drops missing terms, renormalizes, averages

Verified: numerically identical to pre-refactor implementations
```

## Key design decisions

1. **Single canonical Qdrant client** (services/api/core/qdrant.py):
   - Was: 4 separate client constructors in different modules
   - Now: One `get_qdrant_client(raise_on_unavailable=True)`
   - Supports both failure modes (hard exception or soft None)

2. **Embedding model is cached singleton**:
   - Sentence transformer loaded ONCE at startup via `@functools.lru_cache`
   - NOT reloaded per request (that was a 2-3sec performance bug)
   - All embeddings use same model (reproducible)

3. **Skill descriptions are hand-maintained, not auto-generated**:
   - ~40 curated skills with descriptions
   - New skills fall back to bare name (degrades gracefully)
   - Not generated via LLM (consistency + cost)

4. **Weights are config but validated**:
   - Hackathon weights now configurable via `scoring_config`
   - But if invalid (don't sum to 1.0), they're silently fixed
   - Conservative: better to wrong-normalize than crash

## Limitations

- Embedding model is frozen (sentence-transformers model, trained offline)
- Qdrant collections aren't versioned (schema changes are risky)
- Multi-provider support adds complexity (not all providers support structured output equally)
- Cold-start: Qdrant collections start empty (plagiarism corpus, novelty corpus build over time)

## Where this lives

| Component | File |
|---|---|
| Qdrant client helper | `services/api/core/qdrant.py` |
| LLM gateway | `services/api/core/llm.py` |
| Embedding model loader | `services/agents/recruitment/tools/embeddings.py::get_embedder()` |
| Skill descriptions | `services/agents/recruitment/tools/skill_descriptions.py` |
| Shared scoring helper | `services/agents/common/scoring.py` |
| Role taxonomy | `services/agents/candidate_intelligence/tools/role_taxonomy.py` |
| Config: LLM provider | `services/api/core/config.py::LLM_PROVIDER, LLM_MODEL_*` |
| Config: Qdrant endpoint | `services/api/core/config.py::QDRANT_URL` |
