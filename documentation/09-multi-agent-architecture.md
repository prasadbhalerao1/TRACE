# Multi-Agent Architecture & Supervisor

## What "multi-agent" means here

LangGraph-based orchestration of multiple independent StateGraphs, NOT autonomous agents negotiating freely. This is **structured orchestration**: each graph has explicit nodes, edges, and a well-defined state schema.

## The agent/graph inventory

```
Recruitment Module
  ├─ matching_graph: skill match + semantic rank → top candidates
  └─ copilot_graph: natural language query → ranked results

Candidate Intelligence Module  
  ├─ talent_score_graph: ingest resume/GitHub → compute 7-dim score
  └─ career_guidance_graph: skill gaps + salary + learning paths

Assessment Module
  ├─ verification_graph: static analysis + LLM review → coding score
  ├─ interview_graph: turn-based Q&A → final report
  └─ contribution_graph: git commit analysis → team breakdown

Fraud Module
  ├─ cert_graph: issuer lookup + auto-verify + visual forensics → verdict
  ├─ plagiarism_graph: structural + text similarity → plagiarism flag
  ├─ duplicate_graph: photo hash + text fingerprint → duplicate profile
  └─ content_graph: perplexity heuristic → AI-generation signal

PPT Analyzer Module
  └─ ppt_analyzer_graph: extraction + rubric + plagiarism → deck score

Hackathon Module
  └─ hackathon_ranking_graph: judge + pitch + repo + novelty → rankings

Supervisor Module
  └─ supervisor_graph: intent classification → dispatch to domain graphs
```

Total: 12 distinct graphs. Not all integrated into supervisor yet (scoped implementation).

## Shared architectural conventions

All graphs follow:

1. **TypedDict state schema**: Explicit type hints for state shape
   ```python
   class FraudCheckState(TypedDict):
       subject_type: str
       subject_id: uuid.UUID
       context: dict  # Pre-fetched by router
       signals: list[dict]  # operator.add reducer
       verdict: dict
   ```

2. **Nodes stay DB-free**:
   - Nodes receive data via `context` pre-fetched by router
   - Nodes return signals/verdicts
   - Router persists everything to DB
   - Benefit: testable in isolation, no side effects

3. **Never fabricate on failure** (typed exceptions):
   - Missing data → raise `SpecificUnavailable` exception
   - Caller catches, decides: skip this signal or retry
   - Never return 0.0 or "unknown" as a fallback

4. **Observability via Langfuse**:
   - `start_agent_trace()` wraps each graph invocation
   - Traces include: input_data, output, model_used, tags
   - Audit trail: every agent run recorded in `AgentRun` table

## The supervisor's actual scope

```
User Query (text)
    ↓
    ├─→ Supervisor Intent Classification (small LLM)
    │   - "Find me senior backend engineers in SF" → recruiter_query intent
    │   - "How do I close my skill gap?" → career_guidance intent
    │
    ├─→ Dispatch to Domain Graph
    │   ├─ recruiter_query → recruitment/copilot_graph
    │   ├─ career_guidance → candidate_intelligence/career_guidance_graph
    │   ├─ interview_practice → assessment/interview_graph
    │   ├─ fraud_review → fraud/cert_graph (admin only)
    │   └─ (12+ intents → graphs)
    │
    └─→ Return Domain Graph Output
```

**Honest scope**: Supervisor covers ~6-8 high-value intents (recruiting, career, interview). Fraud detection, hackathon ranking are direct API calls, not routed through supervisor (this is fine; it's scoped, not incomplete).

## A concrete example: Interview graph (real agentic behavior)

```
Start Interview Session
    ↓
    ├─→ [topic_planning] Generate topics from job description
    │   State update: topic_plan = ["Technical Depth", "System Design", ...]
    │
    └─→ Loop: for each topic
           ├─→ [question_generation] LLM: "Ask about Technical Depth"
           │   Output: question text
           │
           ├─→ Candidate responds (human input)
           │
           ├─→ [turn_evaluation] LLM: "Grade this answer 0-100"
           │   State update: per_topic_scores["Technical Depth"] = 75
           │
           └─→ [CONDITIONAL EDGE] Route based on live score:
                   if follow_up_count < 3 AND score < 70:
                       → [follow_up_generation] (loop back)
                   elif all_topics_done:
                       → [report_generation]
                   else:
                       → [question_generation] (next topic)
```

**Why this is "real" multi-agent**:
- Not a single wrapped prompt (would be 1-hour conversation token soup)
- Conditional routing based on live intermediate scores
- Separate node per concern (topic planning, evaluation, routing)
- State machines, not procedural code

## Key design decisions

1. **Supervisor exists but is narrowly scoped**:
   - Covers recruiter queries, career, interview
   - Fraud detection + hackathon ranking are direct API → graph
   - Honest tradeoff: simpler supervisor, not all features integrated
   - Future: expand supervisor as needed

2. **Nodes are DB-free by convention**:
   - Enforced: nodes receive TypedDict, return signals
   - Benefits: testable, composable, no implicit dependencies
   - Persistence handled exclusively by router

3. **Conditional routing used sparingly**:
   - Only where it matters (interview scoring, fraud verdicts)
   - Simpler graphs are linear (no routing needed)
   - Justification: routing adds complexity; use only when value is clear

4. **Langfuse tracing on every agent run**:
   - Cost: extra LLM inference for each trace (minimal)
   - Benefit: complete audit trail + performance visibility
   - Fallback: if Langfuse unavailable, trace silently fails

## What could go wrong / limitations

- Supervisor's scope is narrower than it appears; fraud/hackathon bypass it
- Node isolation means nodes can't call other agents (by design; enforced)
- Conditional edges are coupled to state schema; refactoring is risky
- LangGraph version upgrades need careful testing (breaking changes possible)

## Where this lives

| Component | File |
|---|---|
| Supervisor graph | `services/agents/supervisor/graph.py` |
| Supervisor routing | `services/agents/supervisor/nodes/intent_classifier.py` |
| Interview graph | `services/agents/assessment/interview_graph.py` |
| Fraud cert graph | `services/agents/fraud/cert_graph.py` |
| Hackathon ranking | `services/agents/hackathon/graph.py` |
| Node contract | `.agents/constraints.md` |
| Shared scoring helper | `services/agents/common/scoring.py` |
| Qdrant client helper | `services/api/core/qdrant.py` |
| Agent run audit | `packages/db/models/agent_run.py` |
| Langfuse tracing | `services/api/core/tracing.py` |
