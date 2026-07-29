# Build Roadmap

Persisted from the user's Phase 0/1/2 plan (2026-07-29) so a fresh Claude Code session building
any module has this without the user re-pasting it. Read alongside `.agents/DOCUMENTATION_MAP.md`,
`.agents/decisions.md`, and the two module docs relevant to whatever you're building.

---

## Phase 0 — Foundation (no AI features yet)

Before touching any module, get this working and log-in-able for all 5 roles:

- Run the Alembic migration for doc 00 §4's shared core tables (`organizations`, `users`, `files`,
  `consents`, `events`, `agent_runs`, `audit_logs`).
- Wire auth (Clerk) + the RBAC dependency (`services/api/core/rbac.py`).
- Build the empty route-group shells from doc 10 §1 — just enough that each role can log in and
  see their own (empty) dashboard.

**Definition of done:** you can create a user of each role and land on the correct empty dashboard
with no 403s. Nothing AI-related exists yet. Don't skip this — every module depends on it.

**Status: ✅ Done (2026-07-29).** Schema migrated (Neon), Clerk wired end-to-end, RBAC dependency
live, onboarding + shared dashboard built. Manually verified: sign-up → onboarding → dashboard with
no 403s. See `.agents/decisions.md` for the implementation choices made along the way (schema
version pick, role-onboarding flow, the `/dashboard` routing-collision fix, Neon SSL/pooling
config, phone-auth disabled on the Clerk instance).

(Status: this phase is being implemented — see `.agents/decisions.md` for the specific choices
made where the docs were silent or disagreed.)

---

## Phase 1 — One module at a time, in this order

Per doc 00 §7: Candidate Intelligence (01) → Recruitment (02) → Verification (03) → PPT Analyzer
(04) → Hackathon (05) → Fraud (06).

**Module 01 (Candidate Intelligence) — core loop in progress (2026-07-29).** FR-1 (ingestion:
GitHub OAuth, resume upload+parse, certificate upload+OCR), FR-2 (Talent Score: all 7 sub-scores,
cold-start re-normalization, evidence trail), and FR-3 (dashboard: Evidence Receipt, radar/trend
charts, badges) are built — DB tables, `services/agents/candidate_intelligence/` LangGraph subgraph,
`services/api/routers/candidates.py`, and `(candidate)/profile/edit` + the shared `/dashboard`
candidate view. Verified end-to-end (mechanical scoring, cold-start re-normalization, conflict
detection, badge awarding, DB persistence) via direct graph invocation with a synthetic GitHub
payload — real GitHub ingestion untested live (this network's unauthenticated GitHub rate limit was
exhausted during verification; will work once a real OAuth token is used). **FR-4 (Career Guidance)
and FR-5 (Resume/Portfolio Builder) are NOT started** — next session should pick those up. See
`.agents/decisions.md`'s 2026-07-29 Module 01 entries for the specific choices made.

### The loop, repeated per module

1. **Fresh Claude Code session.** Feed it exactly: doc 00 (shared schema) + doc 07 (agent
   architecture) + the one module doc you're building (e.g. `01-candidate-intelligence-platform.md`)
   + doc 08 if that module has formulas in it. Nothing else — don't paste all 13 docs every time.
2. **Build inside-out, in this order, within the module:**
   - DB models + Alembic migration for that module's tables
   - Deterministic tool functions first (parsers, static analysis wrappers, formula implementations
     from doc 08) — plain Python, no LLM, easiest to get right and test
   - LangGraph agents wrapping those tools
   - FastAPI routers exposing the agents
   - Frontend pages, wired to the routers last
3. **Test the module in isolation.** Each module doc's FR list (e.g. doc 02's FR-1 through FR-4) is
   already the acceptance checklist — turn it into a todo list and check items off.
4. **Seed fake data** for anything upstream that isn't built yet. Building Recruitment (02) needs
   `candidate_profiles` and `talent_scores` to exist — insert a handful of fake rows directly
   rather than waiting for Module 01 to be flawless. This is what lets modules build in parallel
   later without one blocking the other.

**Definition of done, per module:** every FR in that module's doc is checked off, and you've
manually walked through the matching flow in doc 11 (e.g. the full Candidate flow for module 01)
at least once, end to end, for real.

---

## Phase 2 — Integration pass (after all 6 exist independently)

- Wire the supervisor graph (doc 07 §2) so requests route to the right module subgraph.
- Wire the actual cross-module event flows — the ones explicitly documented, nothing improvised:
  - Doc 05 → Doc 02 (`hackathon.rankings.finalized` event → recruiter watchlist notification)
  - Doc 05 → Doc 04 (repo/deck linking invokes the PPT Analyzer pipeline)
  - Doc 05 → Doc 03 (repo linking invokes static analysis + contribution agent)
- Walk every role journey in doc 11 end to end, manually, at least once.

---

## Rules that prevent the drift we already hit once

- **Don't run multiple parallel Claude Code sessions building different modules at the same time
  without a shared source of truth open in each.** This is exactly how `judge_evaluations` ended up
  duplicated across doc 02 and doc 05 before it was caught — two sessions independently invented
  the same table because neither had visibility into what the other built.
- **When a module needs to call another module's logic, say so explicitly in the prompt** — "call
  the existing PPT Analyzer pipeline via its API, do not reimplement scoring here." Left unstated,
  an assistant will happily write a second implementation.
- **Keep `.agents/decisions.md` updated** for anything that deviates from the docs during real
  implementation — an LLM session will make different micro-decisions each time it's asked the
  same ambiguous question. Feed that file into future sessions alongside the module docs so
  decisions stay consistent across sessions, not just within one.

---

## Suggested pacing (adjust to actual timeline)

| Phase | What |
|---|---|
| 0 | Foundation: schema, auth, empty shells |
| 1 | Candidate Intelligence — the module everything else reads from |
| 2 | Recruitment (seed fake candidate data if 1 isn't finished) |
| 3 | Verification (Pyodide sandbox + Web Speech interview) |
| 4 | PPT Analyzer (independent, can happen in parallel with 3 if two people are working) |
| 5 | Hackathon Pipeline (needs 3 and 4 for repo/deck scoring) |
| 6 | Fraud Prevention (layer on last, once real data exists to check) |
| Final | Supervisor wiring + full role-journey walkthroughs from doc 11 |
