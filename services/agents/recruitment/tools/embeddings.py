"""Embedding + Qdrant access for Module 02.

`get_embedder()` caches the `SentenceTransformer` as a process-level singleton
(`functools.lru_cache`) — the model load from disk cost seconds on every single call
(job creation, matching, Copilot search, per-candidate skill centroids), compounding
badly since matching invokes it once per candidate in the pool.

Two Qdrant collections are involved:
- `job_description_embeddings` (new, owned by this module) — one point per job posting,
  payload `{job_id, location, remote_ok, required_skill_tags}` for combined
  payload-filter + vector queries (doc 02 §6).
- `candidate_project_embeddings` (reused from Module 01's `judgment_scores.py`) — payload
  is only `{candidate_id, repo_name}` where `repo_name` is actually a whole descriptive
  string (`"{repo_full_name}: {languages}"`), not a clean repo name field. Project
  Relevance / Copilot semantic candidate search both read this collection as-is rather
  than assuming richer metadata that was never written.
"""

import functools
import uuid

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from services.api.core.config import get_settings
from services.api.core.qdrant import QdrantUnavailable
from services.api.core.qdrant import get_qdrant_client as _get_qdrant_client

JOB_EMBEDDINGS_COLLECTION = "job_description_embeddings"
CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION = "candidate_project_embeddings"


class RecruitmentUnavailable(RuntimeError):
    """Raised when Qdrant or the embedding model isn't reachable, or a required LLM key
    is missing — never fabricate a match score, ranking, or explanation."""


def get_qdrant_client() -> QdrantClient:
    try:
        return _get_qdrant_client(raise_on_unavailable=True)
    except QdrantUnavailable as exc:
        raise RecruitmentUnavailable(str(exc)) from exc


@functools.lru_cache(maxsize=1)
def get_embedder():
    try:
        from sentence_transformers import SentenceTransformer

        settings = get_settings()
        return SentenceTransformer(settings.embedding_model)
    except Exception as exc:
        raise RecruitmentUnavailable(f"Embedding model unavailable: {exc}") from exc


def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    model = get_embedder()
    return model.encode(texts).tolist()


def upsert_job_embedding(
    client: QdrantClient,
    job_id: str,
    job_vector: list[float],
    location: str | None,
    remote_ok: bool,
    required_skill_tags: list[str],
) -> None:
    if not client.collection_exists(JOB_EMBEDDINGS_COLLECTION):
        client.create_collection(
            collection_name=JOB_EMBEDDINGS_COLLECTION,
            vectors_config=qmodels.VectorParams(size=len(job_vector), distance=qmodels.Distance.COSINE),
        )
    client.upsert(
        JOB_EMBEDDINGS_COLLECTION,
        points=[
            qmodels.PointStruct(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, f"job:{job_id}")),
                vector=job_vector,
                payload={
                    "job_id": job_id,
                    "location": location,
                    "remote_ok": remote_ok,
                    "required_skill_tags": [t.lower() for t in required_skill_tags],
                },
            )
        ],
    )


def candidate_project_relevance(
    client: QdrantClient, candidate_id: str, job_vector: list[float]
) -> float | None:
    """0-100, `None` (cold start) when the candidate has no seeded project embeddings yet
    — never a fabricated 0, which would look like "actively irrelevant" rather than
    "no evidence available." Averages this candidate's own project-embedding
    similarities to the job vector (payload-filtered to just this candidate's points)."""
    if not client.collection_exists(CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION):
        return None
    # Use query_points() (renamed from search() in qdrant-client >= 1.8)
    response = client.query_points(
        CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION,
        query=job_vector,
        query_filter=qmodels.Filter(
            must=[qmodels.FieldCondition(key="candidate_id", match=qmodels.MatchValue(value=candidate_id))]
        ),
        limit=10,
    )
    if not response.points:
        return None
    avg_similarity = sum(max(0.0, h.score) for h in response.points) / len(response.points)
    return round(100.0 * avg_similarity, 1)


def batch_candidate_project_relevance(
    client: QdrantClient, candidate_ids: list[str], job_vector: list[float]
) -> dict[str, float | None]:
    """Same scoring as `candidate_project_relevance`, but issues one `search_batch` round-trip
    to Qdrant for the whole candidate pool instead of one sequential `.search()` call per
    candidate — matching latency no longer scales linearly with candidate-pool size."""
    if not candidate_ids:
        return {}
    if not client.collection_exists(CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION):
        return dict.fromkeys(candidate_ids)

    requests = [
        qmodels.SearchRequest(
            vector=job_vector,
            filter=qmodels.Filter(
                must=[qmodels.FieldCondition(key="candidate_id", match=qmodels.MatchValue(value=cid))]
            ),
            limit=10,
            with_payload=False,
        )
        for cid in candidate_ids
    ]
    batch_results = client.search_batch(CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION, requests=requests)

    scores: dict[str, float | None] = {}
    for cid, hits in zip(candidate_ids, batch_results):
        if not hits:
            scores[cid] = None
            continue
        avg_similarity = sum(max(0.0, h.score) for h in hits) / len(hits)
        scores[cid] = round(100.0 * avg_similarity, 1)
    return scores


def candidate_skill_centroid(candidate_skill_names: list[str]) -> list[float] | None:
    """Mean of each individual skill's embedding — same centroid technique as Module 01's
    `skill_gap.py._pick_target_role`, reused here so a candidate without any seeded
    per-project embeddings can still get a coarse semantic-similarity number for Copilot
    search and matching, instead of hard-failing to `None` every time."""
    if not candidate_skill_names:
        return None
    vectors = np.array(embed_texts(candidate_skill_names))
    return vectors.mean(axis=0).tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a_arr, b_arr = np.array(a), np.array(b)
    denom = np.linalg.norm(a_arr) * np.linalg.norm(b_arr)
    if denom == 0:
        return 0.0
    return float(np.dot(a_arr, b_arr) / denom)


# Below this cosine similarity, two skills are treated as unrelated rather than a fuzzy
# match. Measured directly against `skill_descriptions.py`'s curated descriptions (bare
# skill-name embeddings don't separate genuinely related skills from unrelated ones —
# "Vue.js" vs "React" as bare names embeds at 0.65, barely above "Photoshop" vs "React" at
# 0.64; the same pair with one descriptive sentence each jumps to 0.89 vs 0.66, a wide and
# reliable gap): 0.80 sits cleanly between "React" vs "Vue.js" (0.89, a real sibling-skill
# match worth partial credit) and "React" vs "Photoshop" (0.66, genuinely unrelated).
SKILL_SIMILARITY_THRESHOLD = 0.80


def best_skill_similarity(candidate_skill_names: list[str], required_skill: str) -> tuple[str | None, float]:
    """Returns (best_matching_candidate_skill_or_None, similarity_0_to_1). Used as a
    fallback when a required skill has no exact/case-insensitive match in the candidate's
    skill list — e.g. a candidate listing "Vue.js" against a job requiring "React" should
    score partial, semantically-grounded credit instead of zero, the same way
    `candidate_skill_centroid` already lets Copilot's free-text search catch related
    skills instead of only literal ones. Compares `skill_descriptions.py`'s curated
    descriptive text when available (falling back to the bare name otherwise), not the
    bare skill names directly — see SKILL_SIMILARITY_THRESHOLD's docstring for why."""
    if not candidate_skill_names:
        return None, 0.0
    from services.agents.recruitment.tools.skill_descriptions import describe_skill

    required_vector = embed_texts([describe_skill(required_skill)])[0]
    candidate_vectors = embed_texts([describe_skill(name) for name in candidate_skill_names])
    best_name, best_score = None, 0.0
    for name, vector in zip(candidate_skill_names, candidate_vectors):
        score = cosine_similarity(required_vector, vector)
        if score > best_score:
            best_name, best_score = name, score
    return best_name, best_score
