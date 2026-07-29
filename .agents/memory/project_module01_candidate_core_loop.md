---
name: module01-candidate-core-loop
description: "Status of Module 01 (Candidate Intelligence) build — what's done, what's deferred, what's missing to test live"
metadata: 
  node_type: memory
  type: project
  originSessionId: 16352565-6648-4267-adde-3cdec207f5a5
  modified: 2026-07-29T09:28:30.605Z
---

As of 2026-07-29, Module 01 (Candidate Intelligence Platform) has its "core loop" built: FR-1
(ingestion — GitHub OAuth, resume upload+parse, certificate upload+OCR), FR-2 (Talent Score — all 7
sub-scores, cold-start re-normalization, evidence trail via `agent_runs`), and FR-3 (dashboard —
Evidence Receipt, radar/trend charts, badges). Code lives in `packages/db/models.py` (new tables),
`services/agents/candidate_intelligence/` (LangGraph subgraph), `services/api/routers/candidates.py`,
and `apps/web/src/app/(candidate)/profile/edit` + the shared `apps/web/src/app/dashboard/page.tsx`
(extended to render `CandidateDashboard` for candidate-role users).

**Not started yet:** FR-4 (Career Guidance: skill gaps, roadmap, salary prediction) and FR-5
(Resume/Portfolio Builder with fact-check agent). Pick these up next for Module 01, or move to
Module 02 (Recruitment) per [[doc_sets_both_current]]'s roadmap ordering — check with the user which.

**Why:** [[build_roadmap_inside_out]] says build one module at a time, inside-out (DB → tools →
agents → routes → frontend); FR-1–3 is the "get a real score onto a dashboard" slice, FR-4/5 are a
separate, independently-testable increment.

**Blocking for live end-to-end testing:** `ANTHROPIC_API_KEY` is empty and `CLOUDINARY_URL` is a
literal unfilled placeholder in `.env` — resume upload (needs both), certificate storage, and the
Project Quality/Innovation LLM-judgment sub-scores will raise `ResumeExtractionUnavailable` /
`StorageUnavailable` until real keys are added. GitHub ingestion works for real (client id/secret are
configured) but wasn't tested live in this session — the dev network's unauthenticated GitHub rate
limit got exhausted mid-verification, so real ingestion was validated via a synthetic `GithubAnalysis`
payload instead of a live API call. A real OAuth-token-based run should be tried once a candidate
account actually completes the "Connect GitHub" flow in the browser.

**How to apply:** before starting FR-4/5 or debugging why resume upload "doesn't work," check
`.agents/decisions.md`'s 2026-07-29 Module 01 entries first — they record the exact schema/consent/
scoring-scope decisions made and why, so a fresh session doesn't re-derive or contradict them.
