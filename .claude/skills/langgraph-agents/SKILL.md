---
name: langgraph-agents
description: Conventions for building LangGraph agent nodes and graphs under services/agents — the node contract, explainability logging, human-in-the-loop rules, and which docs govern agent architecture in this repo.
---

# LangGraph Agent Conventions (`services/agents`)

## Structure
- One subfolder per module (mirrors `doc/SRS/01-06`: candidate intelligence, recruitment, assessment, PPT analyzer, hackathon pipeline, fraud prevention).
- Each node lives in its own file and **must** export `async def run(state: ModuleState) -> ModuleState` (per `.agents/constraints.md` §2.3) — this keeps `graph.py` a clean list of `add_node("name", node.run)` calls, nothing more.
- Shared state schemas import from `packages/shared_schemas/` — never redefine a module's state shape inside an agent file.
- Use `langgraph dev` (LangGraph Studio) to test a single node's input/output schema in isolation before wiring it into the full graph — faster than going through the FastAPI request path while iterating.

## Explainability (per `.agents/constraints.md` §4)
Every agent run that writes a score or verdict to the database must also write an `agent_runs` row containing: inputs, the model string used, a rationale, and a `langfuse_trace_id`. No score/verdict may be silent — a judge or admin should always be able to answer "why did this happen?" by following that trace.

## Human-in-the-loop (per `.agents/constraints.md` §4)
- Fraud Detection Agent output (`raised` status) must never automatically change a Talent Score or remove a candidate from recruiter search results — only a human admin transitioning the flag to `upheld` does that.
- The Recruiter Copilot / search agent is forbidden from filtering on `raised` fraud flags itself.

## Model routing (per `.agents/constraints.md` §5)
Route by task, not by module: Haiku/Groq-Llama for extraction-style nodes (resume field extraction, tagging, MCQ generation, NL query parsing), Claude Sonnet for judgment-style nodes (interview turns, pitch deck rubric scoring, fraud forensics narrative, candidate re-ranking).

## Before adding or changing an agent node
Both doc sets are current — check both, they're complementary:
- `doc/SRS/07-Multi-Agent-Architecture-LangGraph.md` for the agent registry, supervisor graph shape, and state schema.
- `doc/multi-agent-architecture/07-multi-agent-architecture.md` for the same, in more implementation-oriented form.
- `doc/multi-agent-architecture/08-algorithms-and-formulas.md` for the exact formula the node needs to compute.
- The relevant `doc/SRS/01-06` §4 ("Agent Architecture") for that module's specific agent roles.
- If the two sets disagree (see `.agents/DOCUMENTATION_MAP.md` § "Known Differences" — e.g. Cultural Fit scoring is present in `multi-agent-architecture/02` but absent from `SRS/02`), don't silently pick one — ask.
