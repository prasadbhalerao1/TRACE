"""Similarity/Plagiarism Agent — doc 04 §4/§5. Qdrant search against the
`presentation_slide_embeddings` corpus of prior submissions, then upserts this
presentation's own slides into that corpus for future comparisons (same
build-the-corpus-as-you-go pattern as candidate_intelligence's innovation novelty check).

Rule-based, not an LLM call — the doc's "Haiku for narrative" is treated as an optional
UI-copy enhancement, not part of the actual detection; the structured match (matched
presentation, slide index, similarity score) is itself the evidence, consistent with
FR-6/§9's "always ships with evidence, never a bare boolean" requirement extended here
to plagiarism too.
"""

import uuid

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

from services.api.core.config import get_settings

_QDRANT_COLLECTION = "presentation_slide_embeddings"
# Tunable default (doc 08 §3 uses 0.75 for code AST-winnowing similarity; slide-text
# cosine similarity is a different signal so a higher bar is used here to reduce false
# positives from generically-worded slides like "Problem Statement" / "Thank You").
SIMILARITY_THRESHOLD = 0.90


def _get_client() -> QdrantClient | None:
    settings = get_settings()
    try:
        client = QdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key or None, timeout=5.0)
        client.get_collections()
        return client
    except Exception:
        return None


def find_and_record_matches(
    presentation_id: str,
    slides: list[dict],
    embeddings: list[list[float]] | None,
) -> list[dict]:
    """Returns [{matched_presentation_id, slide_index, similarity}] for slides that
    match a PRIOR submission above the threshold, then upserts this deck's own slide
    embeddings so later uploads can be checked against it too."""
    if not embeddings:
        return []

    client = _get_client()
    if client is None:
        return []  # Qdrant unreachable — cold-start degrade, not an error

    try:
        if not client.collection_exists(_QDRANT_COLLECTION):
            client.create_collection(
                collection_name=_QDRANT_COLLECTION,
                vectors_config=qmodels.VectorParams(size=len(embeddings[0]), distance=qmodels.Distance.COSINE),
            )

        matches: list[dict] = []
        for slide, vector in zip(slides, embeddings):
            hits = client.search(
                _QDRANT_COLLECTION,
                query_vector=vector,
                limit=3,
                query_filter=qmodels.Filter(
                    must_not=[qmodels.FieldCondition(key="presentation_id", match=qmodels.MatchValue(value=presentation_id))]
                ),
            )
            for hit in hits:
                if hit.score >= SIMILARITY_THRESHOLD:
                    matches.append(
                        {
                            "matched_presentation_id": hit.payload.get("presentation_id"),
                            "slide_index": slide["index"],
                            "similarity": round(float(hit.score), 4),
                        }
                    )

        client.upsert(
            _QDRANT_COLLECTION,
            points=[
                qmodels.PointStruct(
                    id=str(uuid.uuid4()),
                    vector=vector,
                    payload={"presentation_id": presentation_id, "slide_index": slide["index"]},
                )
                for slide, vector in zip(slides, embeddings)
            ],
        )
        return matches
    except Exception:
        return []
