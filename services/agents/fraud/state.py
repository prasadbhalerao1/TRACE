"""State schema for the four independent detection subgraphs (doc 06 §4). All four share
one shape so the router's post-processing (persist `verification_records`, conditionally
raise a `fraud_flags` row, call the Fraud Risk Report Agent) is uniform regardless of
which subgraph produced it — matching doc 06's own mermaid diagram where all four verdict
nodes (C5/P4/D4/A3) feed the same downstream Aggregation -> Report -> Queue pipeline.

Nodes stay DB-free (this codebase's universal convention — see `.agents/decisions.md`'s
Module 05 entry). The router pre-fetches everything a node needs into `context` (the
certificate's fields, a submission's code + comparison corpus, a profile's text/photo +
corpus of other profiles, resume text) before invoking the graph, then persists whatever
the graph hands back in `signals`/`verdict`.

`signals` uses an `operator.add` reducer because `duplicate_graph` fans two independent
nodes (`text_fingerprint`, `photo_hash`) out from START in the same superstep — returning
the full state from either would collide on this key (the exact bug documented in
`.agents/decisions.md`'s "LangGraph parallel fan-out" entry for Module 01); the reducer
lets both branches append their own signal(s) safely. Sequential graphs (cert, plagiarism,
content) still work fine with the same reducer — each node's `{"signals": [...]}` return
just appends one more entry to the accumulated list.
"""

import operator
from typing import Annotated, Optional, TypedDict


class FraudCheckState(TypedDict):
    subject_type: str  # 'certificate' | 'submission' | 'profile' | 'resume'
    subject_id: str
    context: dict  # router-prefetched data the detection tools need (see graph docstrings)
    signals: Annotated[list[dict], operator.add]  # [{signal_type, score, confidence_label, evidence}]
    verdict: Optional[dict]  # {flag_type, should_flag, confidence_label, evidence} set by the final node
