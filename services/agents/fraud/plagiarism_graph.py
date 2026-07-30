"""Code / Submission Plagiarism subgraph — doc 06 §4:

    structural_similarity --> public_repo_crosscheck --> plagiarism_verdict --> END

Sequential rather than the mermaid's literal fan-out (`P2 -> P3`, `P2 -> P4` in doc 06's
diagram) — `public_repo_crosscheck` doesn't depend on `structural_similarity`'s output,
but running it after keeps `context` a single-writer-per-step dict without needing a
merge-reducer for it (same reasoning as `duplicate_graph.py`'s sequential choice; see that
module's docstring for the parallel-fan-out pitfall this avoids).

Shared for FR-2 (project plagiarism) and FR-5 (Module 03 submission plagiarism) — both
invoke this same graph from `POST /verification/submissions/{id}/check`, since the
detection mechanism (structural code-clone comparison) is identical (doc 06 §4's
"Code/Submission Plagiarism" subgraph handles both). Router pre-fetches the target
submission's code plus a comparison corpus (other `submissions` rows for the same
`assessment_id`, Module 03's table, read-only).
"""

from langgraph.graph import END, START, StateGraph

from services.agents.fraud.nodes import plagiarism_verdict, public_repo_crosscheck, structural_similarity
from services.agents.fraud.state import FraudCheckState


def build_plagiarism_graph():
    graph = StateGraph(FraudCheckState)

    graph.add_node("structural_similarity", structural_similarity.run)
    graph.add_node("public_repo_crosscheck", public_repo_crosscheck.run)
    graph.add_node("plagiarism_verdict", plagiarism_verdict.run)

    graph.add_edge(START, "structural_similarity")
    graph.add_edge("structural_similarity", "public_repo_crosscheck")
    graph.add_edge("public_repo_crosscheck", "plagiarism_verdict")
    graph.add_edge("plagiarism_verdict", END)

    return graph.compile()


_compiled_plagiarism_graph = None


def get_plagiarism_graph():
    global _compiled_plagiarism_graph
    if _compiled_plagiarism_graph is None:
        _compiled_plagiarism_graph = build_plagiarism_graph()
    return _compiled_plagiarism_graph
