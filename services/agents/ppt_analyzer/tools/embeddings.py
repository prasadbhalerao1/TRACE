"""Slide Embedding Agent — doc 04 §4. Self-hosted `bge-large-en-v1.5`, no chat LLM
(same model/pattern as candidate_intelligence's innovation novelty check). Degrades to
`None` if the model can't be loaded (e.g. no network to fetch weights the first time) —
downstream nodes (similarity/plagiarism) treat that as cold-start, not an error.
"""


def embed_texts(texts: list[str]) -> list[list[float]] | None:
    if not texts:
        return None
    try:
        from sentence_transformers import SentenceTransformer

        from services.api.core.config import get_settings

        settings = get_settings()
        model = SentenceTransformer(settings.embedding_model)
        return model.encode(texts).tolist()
    except Exception:
        return None
