# Member 4 — Phase 2 Integration Prep

**This file is self-contained.** You should not need to open any other person's assignment file.
Read `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`, and `.agents/decisions.md` for
shared context first.

## Why this track exists and what "prep" means here

Per `.agents/BUILD_ROADMAP.md`'s Phase 2 ("Integration pass, after all 6 modules exist
independently"), the supervisor graph and cross-module event wiring can't be *fully* tested until
Modules 05 and 06 land (they're being built in parallel by two other people right now — don't wait
for them, but know their tables/routers won't exist on `main` until they merge). What you CAN build
now, with zero blocking dependency: the supervisor's routing skeleton against the 4 subgraphs that
already exist (Modules 01-04), the `events` table consumer-side wiring for the one cross-module
event that's already being published-to-spec (Module 05's `hackathon.rankings.finalized`, per its
own assignment file — you build the *listener*, they build the *publisher*, and you can develop
against a synthetic event row you insert by hand until their code lands), and a full manual
walkthrough of every role's journey through what's already built, per `doc/multi-agent-architecture/
11-role-flows-and-use-cases.md`.

## Part 1 — Supervisor graph skeleton

Read `doc/multi-agent-architecture/07-multi-agent-architecture.md` §2 in full — it has the exact
skeleton code (a `StateGraph(SupervisorState)` with a `classify_intent` node routing to each
module's compiled subgraph via `add_conditional_edges`). Build this at
`services/agents/supervisor/graph.py` with a `SupervisorState` TypedDict in
`services/agents/supervisor/state.py`.

**Two things doc 07 §2's example code assumes that this codebase does NOT actually have — don't
silently "fix" this, just build around it and log the decision:**
1. The example passes `checkpointer=postgres_checkpointer` to `builder.compile(...)`. **No module
   built so far uses a LangGraph checkpointer** — Module 02's Recruiter Copilot and Module 03's
   Interview Agent both deliberately use manual DB-column persistence instead (see
   `.agents/decisions.md`'s Module 02/03 entries for why). Compile the supervisor graph without a
   checkpointer, matching every other graph in this codebase (`get_graph()`-style module-level
   singleton, same pattern as `services/agents/candidate_intelligence/graph.py`).
2. Each module's actual entry point is a REST router (`services/api/routers/*.py`), not a directly
   -importable "subgraph" the supervisor can call as one function — Modules 02/03's LangGraph
   subgraphs are one *piece* of a multi-step router flow (fetch DB context → build state → invoke
   graph → persist → return), not a drop-in callable. Your supervisor's per-module "node" should
   call the module's router logic (or the same service functions the router calls), not just
   `ainvoke()` a bare graph and expect it to have already done DB I/O.

Build one working example end-to-end: a `POST /supervisor/route` endpoint that takes a raw NL
request, classifies intent (Haiku, structured output — same tool-use pattern as every other
classifier this session, e.g. `services/agents/recruitment/tools/copilot_llm.py`'s
`understand_query`), and dispatches to at least 2 of the 4 existing modules' real endpoints
end-to-end (proving the pattern, not building full coverage of all 4 — that's follow-up work once
05/06 exist too).

## Part 2 — Event bus consumer skeleton

The `events` table already exists (`packages/db/models/event.py`) with `event_type`, `payload`,
`created_at`, `processed_at`. No consumer/poller exists anywhere yet. Build a minimal poller
(`services/api/core/event_consumer.py` or a small background task — check if this repo has any
async job runner already; if not, a simple polling loop with an interval is fine for this stage,
don't add a new task-queue dependency like Celery/Arq without checking with the team first) that:

1. Polls for `events` rows where `processed_at IS NULL`.
2. For `event_type = 'hackathon.rankings.finalized'` (the only event type any module doc actually
   specifies right now, per doc 05 §6): reads `payload.candidate_ids`, matches them against
   `recruiter_watchlists` (Module 05's table — read-only, don't modify it), and creates whatever
   Module 02 needs to surface a "Top Performers" notification (check
   `apps/web/src/app/(recruiter)/top-performers/page.tsx` — Module 05's assignment wires this page
   to read from *their* feed endpoint; your job is the backend matching logic that decides *what*
   shows up there, likely a new small table or just computing it live from `recruiter_watchlists` +
   the event payload at read time — the latter is simpler and avoids yet another table, prefer it
   unless there's a clear reason not to).
3. Marks `processed_at` once handled.

**You can develop and test this entirely with a hand-inserted `events` row** (`INSERT INTO events
(event_type, payload) VALUES (...)` via a scratch script, same technique used throughout this
session for live-testing) — you do not need to wait for Module 05's actual publisher code to exist
on `main`. Once it lands, do one final live test with a real event it publishes.

## Part 3 — Full role-journey walkthrough (do this last, after Parts 1-2 have something to test)

Read `doc/multi-agent-architecture/11-role-flows-and-use-cases.md` in full. For each of the 5
roles (candidate, recruiter, organizer, judge, admin), walk their documented journey through
what's actually built on `main` right now, step by step, and write down every gap you find (a page
that doesn't exist, a button that goes nowhere, a flow that doesn't match the doc) in a new file
`.agents/QA_FINDINGS_20260729.md`. Don't fix what you find yourself unless it's trivially in your
own file-ownership area (Part 1/2's files) — file it as a finding for the relevant module's next
session to pick up, same spirit as this session finding and logging (not necessarily fixing) the
`(recruiter)/reports/submission/[id]` pitch-deck-content bug that Module 03 ended up fixing anyway
because it was directly in that session's path.

## File ownership — never touch outside this list

`services/agents/supervisor/`, `services/api/core/event_consumer.py` (or equivalent new file),
`.agents/QA_FINDINGS_20260729.md`, and whatever new small backend piece Part 2.2 needs (prefer
computing live over adding a new table, per the note above — if you do add a table, it's additive
schema in `packages/db/models/`, follow the same migration-chain protocol as everyone else, see
below).

**Do not touch any module's existing `routers/*.py`, `agents/`, or `models/*.py` files** beyond
Part 1's supervisor calling into their existing endpoints (read-only usage, not edits).

## Shared files you WILL edit — expect trivial merge conflicts, not blockers

- `services/api/main.py` — add one `app.include_router(supervisor.router)` line (and the event
  consumer's startup hook, if it needs one).
- `.agents/decisions.md` — append your own dated section at the end, including the two "doc 07
  assumes X, this codebase doesn't have X" notes from Part 1.
- **Alembic migration** (only if Part 2.2 needs a new table): run `alembic heads` right before
  writing it, chain onto whatever you actually see, expect a rebase at merge time — same protocol
  as every other track.

## Definition of done

`POST /supervisor/route` demonstrably dispatches to at least 2 real modules end-to-end. The event
consumer processes a hand-inserted `hackathon.rankings.finalized` row correctly. `.agents/
QA_FINDINGS_20260729.md` exists with a real walkthrough of at least 3 of the 5 roles' journeys
against what's actually built. Commit progressively.
