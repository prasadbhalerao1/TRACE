"""Embedding + Qdrant access for Module 02. Reuses the same lazy, per-call
`SentenceTransformer`/`QdrantClient` construction as
`candidate_intelligence/tools/{judgment_scores,skill_gap}.py` — no module-level caching,
matching existing precedent in this codebase even though it's a known model-load cost on
every call (flagged, not silently "fixed" differently from the rest of the codebase).

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

import uuid

import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from services.api.core.config import get_settings

JOB_EMBEDDINGS_COLLECTION = "job_description_embeddings"
CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION = "candidate_project_embeddings"


class RecruitmentUnavailable(RuntimeError):
    """Raised when Qdrant or the embedding model isn't reachable, or a required LLM key
    is missing — never fabricate a match score, ranking, or explanation."""


def get_qdrant_client() -> QdrantClient:
    settings = get_settings()
    try:
        client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None, timeout=5.0)
        client.get_collections()
        return client
    except Exception as exc:
        raise RecruitmentUnavailable(f"Qdrant is not reachable at {settings.qdrant_url}: {exc}") from exc


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
    hits = client.search(
        CANDIDATE_PROJECT_EMBEDDINGS_COLLECTION,
        query_vector=job_vector,
        query_filter=qmodels.Filter(
            must=[qmodels.FieldCondition(key="candidate_id", match=qmodels.MatchValue(value=candidate_id))]
        ),
        limit=10,
    )
    if not hits:
        return None
    avg_similarity = sum(max(0.0, h.score) for h in hits) / len(hits)
    return round(100.0 * avg_similarity, 1)


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
