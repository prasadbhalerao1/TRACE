"""Similarity/Plagiarism Agent — doc 04 §4. Node contract: constraints.md §2.3.

Runs after slide_embedding (needs the embeddings, hence the single incoming edge in
graph.py rather than fanning out straight from content_extraction).
"""

from services.agents.ppt_analyzer.state import PitchAnalysisState
from services.agents.ppt_analyzer.tools.plagiarism import find_and_record_matches


async def run(state: PitchAnalysisState) -> dict:
    slides = state.get("slides") or []
    embeddings = state.get("slide_embeddings")
    if not slides or not embeddings:
        return {"plagiarism_matches": []}

    matches = find_and_record_matches(state["presentation_id"], slides, embeddings)
    return {"plagiarism_matches": matches}
