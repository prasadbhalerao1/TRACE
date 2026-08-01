"""Qdrant client construction — shared by every module that does vector search (Job
Matching/Copilot, Talent Score innovation-novelty, Career Guidance skill-gap, PPT
Analyzer plagiarism/cross-event-novelty). Previously each module hand-rolled its own
"connect, verify with get_collections(), wrap the exception" logic; consolidated here
since all four copies were byte-for-byte identical except for how they signal failure.

Two failure conventions coexist across call sites and both are preserved exactly:
- Some callers (recruitment matching, skill-gap) want a hard failure — Qdrant being
  unreachable means the whole feature has no output, so a typed exception should
  propagate and become a 503, never a fabricated score.
- Others (innovation novelty, plagiarism) treat Qdrant as one optional signal among
  several — Qdrant being unreachable should cold-start-degrade (return `None`/skip),
  not take down the whole request.
`raise_on_unavailable` picks between the two without duplicating the connection logic.
"""

from qdrant_client import QdrantClient

from services.api.core.config import get_settings


class QdrantUnavailable(RuntimeError):
    """Raised when Qdrant isn't reachable, if the caller asked to raise rather than
    receive `None` — never fabricate a vector-search result."""


def get_qdrant_client(*, raise_on_unavailable: bool = True) -> QdrantClient | None:
    settings = get_settings()
    try:
        # Use prefer_grpc=False to force HTTP/REST client (has search() method).
        # By default, QdrantClient tries gRPC first, which doesn't have search() in all versions.
        client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
            timeout=5.0,
            prefer_grpc=False
        )
        client.get_collections()
        return client
    except Exception as exc:
        if raise_on_unavailable:
            raise QdrantUnavailable(f"Qdrant is not reachable at {settings.qdrant_url}: {exc}") from exc
        return None
