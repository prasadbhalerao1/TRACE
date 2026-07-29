---
name: langgraph-parallel-fanout
description: "LangGraph node functions in this repo must return partial state dicts, not the full mutated state, when nodes run in parallel"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 16352565-6648-4267-adde-3cdec207f5a5
  modified: 2026-07-29T09:28:46.185Z
---

In this repo's LangGraph subgraphs, a node's `run(state)` must return only the keys it actually
changes — never the full state object (even if you mutated the passed-in dict and return it as-is).

**Why:** doc 07's fan-out/fan-in pattern (several agent nodes running off the same `START`, feeding
into one merge node) means multiple nodes execute in the same superstep. If each node returns the
entire state — including untouched keys like `candidate_id` — every parallel branch writes the same
value to every channel, and langgraph's default "last value" channel raises
`InvalidUpdateError: Can receive only one value per step` the instant two branches write to one key
in the same step, even when the values are identical. Discovered building Module 01's ingestion graph
(`services/agents/candidate_intelligence/graph.py`): `resume_parser`, `github_analysis`, and
`certificate_ocr` all fan out from `START` into `profile_merge`.

For keys that genuinely need contributions from multiple parallel nodes (e.g. `conflicts`, written by
both `resume_parser` and `certificate_ocr`), the `TypedDict` field needs a reducer:
`Annotated[list[str], operator.add]` — and each node must return only its own *new* entries, not the
accumulated list, since the reducer does the concatenating across the whole run, not just one step.

**How to apply:** when writing any new LangGraph node (Module 02 Recruitment, 03 Verification, etc.
per doc 07's supervisor graph), write `run()` to build and return a small dict of just its outputs.
Before wiring a new subgraph's frontend, run it directly via `get_graph().ainvoke(...)` with a
synthetic state (bypassing HTTP/auth) — that's how this bug was actually caught, before any frontend
work was built on top of a broken graph.
