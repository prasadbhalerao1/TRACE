# Parallel Work Assignments (4 people, 2026-07-29)

**Read this whole file before writing any code.** It exists to stop 4 simultaneous Claude Code
sessions from duplicating work or corrupting shared files — read `.agents/BUILD_ROADMAP.md` (build
order + module status), `.agents/DOCUMENTATION_MAP.md` (which doc to trust when they disagree), and
`.agents/decisions.md` (precedent for ambiguous calls already made) right after this file, every
session, every time you resume.

## Status as of this writing

Modules 01 (Candidate Intelligence), 02 (AI Recruitment), 04 (PPT Analyzer) are **fully merged on
`main`**. Module 03 (Assessment & Verification) is **in progress right now, same session that wrote
this file** — DB schema + all three LangGraph subgraphs done, router + frontend not yet built.
Modules 05 (Hackathon Pipeline) and 06 (Trust & Fraud Prevention) are **not started**.

## The 4 tracks

| # | Owner | Track | Depends on (read-only) | Status |
|---|---|---|---|---|
| 1 | You (this session) | Module 03 — Assessment & Verification | Module 01 (candidate_profiles) | In progress |
| 2 | Person 2 | Module 05 — Hackathon-to-Hiring Pipeline | Module 01, 03 (submissions/contribution_reports), 04 | Not started |
| 3 | Person 3 | Module 06 — Trust & Fraud Prevention | Module 01, 03 (submissions), 04 | Not started |
| 4 | Person 4 | Platform Hardening & Observability | None — can start immediately | Not started |

Modules 05 and 06 both **read** Module 03 tables (`submissions`, `contribution_reports`) that don't
exist on `main` yet as of this writing. Don't block on that: build your own schema/router/agents
against your own tables now, and treat any Module 03 read as a `TODO` you wire up once you `git
pull main` and see it land. Do not modify Module 03's files to "help" — see boundaries below.

## Hard file-ownership boundaries

Each track owns these directories/files exclusively. **Never edit another track's owned files** —
if you need something from another module, either wait for it to land on `main` and read it via its
public router/table (never reach into another module's internal `tools`/`nodes`), or flag it in
your own session's summary instead of touching it yourself.

**Track 1 (Module 03)**: `packages/db/models/assessment.py`, `packages/shared_schemas/
assessment.py`, `services/agents/assessment/`, `services/api/routers/assessments.py`, `apps/web/
src/app/(candidate)/assessments/`, `apps/web/src/app/(candidate)/interview/`, `apps/web/src/app/
(recruiter)/reports/submission/`, `apps/web/src/app/(recruiter)/reports/interview/`, `apps/web/src/
app/(recruiter)/reports/contribution/`.

**Track 2 (Module 05)**: new `packages/db/models/hackathon.py`, new `packages/shared_schemas/
hackathon.py`, new `services/agents/hackathon/`, new `services/api/routers/hackathons.py`,
`apps/web/src/app/(organizer)/`, `apps/web/src/app/(judge)/`, `apps/web/src/app/(recruiter)/
top-performers/`. Read doc/SRS/05 + doc/multi-agent-architecture/05 first — note FR-6's event
publish on ranking-finalize is what Module 02's recruiter surfacing will eventually consume (Phase
2, not your job to wire the consumer side).

**Track 3 (Module 06)**: new `packages/db/models/fraud.py`, new `packages/shared_schemas/
fraud.py`, new `services/agents/fraud/`, new `services/api/routers/fraud.py`, `apps/web/src/app/
(admin)/fraud-review/`, `apps/web/src/app/(candidate)/my-flags/`. Read doc/SRS/06 +
doc/multi-agent-architecture/06 first — §7/§8 (fraud flags are never a silent auto-reject filter,
human review required past `raised`) are binding constraints already enforced elsewhere in this
codebase (`.agents/constraints.md` §4's "Adverse Decision Protection" — Module 02's Copilot already
has a test-relevant carve-out for this, don't touch it, just don't violate the same rule in your own
code).

**Track 4 (Hardening)**: `services/api/main.py` (exception handler — additive, see below),
`services/api/core/` (Langfuse/Sentry/rate-limit wiring — new files or additive changes to
`config.py` only), new E2E test infra under `apps/web/e2e/` or similar, `.agents/` doc upkeep.
**Do not touch any module's router/agents/model files.**

## Shared files everyone will touch — protocol, not avoidance

These files WILL get concurrent edits from multiple tracks. That's expected and fine — the fix is
at merge time, not by one track blocking on another:

- **`packages/db/models/__init__.py`**: each track adds its own import block + `__all__` entries.
  Trivial merge conflict, resolve by keeping both sides' additions.
- **`services/api/main.py`**: each track adds one `app.include_router(...)` line. Same — trivial,
  keep both.
- **`.agents/decisions.md`**: append your own dated section at the end, same format as the existing
  Module 01/02/03 entries. Never edit another track's section.
- **Alembic migration chain**: before writing your migration, run `alembic heads` against your own
  branch/worktree — **do not** assume the hex you see in this file is still the real head by the
  time you get to it, other tracks are landing migrations concurrently. Chain your `down_revision`
  onto whatever head you actually see. **Expect a rebase at merge time** (regenerate
  `down_revision` so the four tracks' migrations end up in one linear chain, `alembic heads` shows
  exactly one head) — this exact situation already happened once this session with 3 parallel
  migrations and is a known, solved problem; see `.agents/decisions.md`'s 2026-07-29 entries for the
  precedent (`fix(db): linearize ... migration` commits).
- **`apps/web/src/lib/api.ts`**: each track appends its own `// --- Module N ---` section at the
  end. Trivial merge, don't edit another track's section.

## Kickoff prompt for Person 2 (Module 05)

> Read `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`, `.agents/decisions.md`, and
> `.agents/PARALLEL_WORK_ASSIGNMENTS.md` first. You own Module 05 (Hackathon-to-Hiring Pipeline) —
> read `doc/SRS/05-SRS-Hackathon-to-Hiring-Pipeline.md` and
> `doc/multi-agent-architecture/05-hackathon-pipeline.md` in full. Build inside-out (DB → tools →
> LangGraph agents → FastAPI router → frontend), following the exact patterns already established
> in `services/agents/recruitment/` and `services/api/routers/recruitment.py` (Module 02, already
> merged — read it as your template for state.py/nodes/tools/graph structure, router auth
> patterns, and how to verify live against the real Neon DB before calling anything done). Only
> touch the files listed under "Track 2" in `.agents/PARALLEL_WORK_ASSIGNMENTS.md`. Log every
> ambiguous-doc-resolution decision to `.agents/decisions.md` as you go. Commit progressively (DB →
> agents → router → frontend), not one giant commit at the end.

## Kickoff prompt for Person 3 (Module 06)

> Read `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`, `.agents/decisions.md`, and
> `.agents/PARALLEL_WORK_ASSIGNMENTS.md` first. You own Module 06 (Trust & Fraud Prevention) — read
> `doc/SRS/06-SRS-Trust-Fraud-Prevention.md` and
> `doc/multi-agent-architecture/06-trust-fraud-prevention.md` in full, especially §7/§8's binding
> human-review-required constraints. Build inside-out, following `services/agents/recruitment/` and
> `services/api/routers/recruitment.py` (Module 02) as your structural template. This is the
> highest ethical-risk module in the whole platform — every flag must be evidence-linked and
> reversible by a human, never a silent auto-reject; if you're unsure whether a design choice
> crosses that line, stop and ask rather than picking the more automated option. Only touch the
> files listed under "Track 3" in `.agents/PARALLEL_WORK_ASSIGNMENTS.md`. Log decisions to
> `.agents/decisions.md`. Commit progressively.

## Kickoff prompt for Person 4 (Hardening)

> Read `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`, `.agents/decisions.md`, and
> `.agents/PARALLEL_WORK_ASSIGNMENTS.md` first. You have no module dependency — start immediately.
> Your scope: (1) add a global FastAPI exception handler in `services/api/main.py` so unhandled
> backend errors still carry CORS headers instead of the browser misreporting them as CORS
> failures (a real bug found and worked around, not yet fixed at the root, this session — see the
> "DB migration bug found on Module 01" entry in `.agents/decisions.md` for the exact symptom); (2)
> wire Langfuse tracing (`LANGFUSE_PUBLIC_KEY`/`SECRET_KEY` already in `.env`, `agent_runs.
> langfuse_trace_id` column already exists and is currently always null — populate it for real);
> (3) wire Sentry (`SENTRY_DSN` already in `.env`, unused); (4) wire the rate limiter
> (`RATE_LIMIT_PER_MINUTE` setting exists, unused); (5) set up real E2E test infrastructure — a
> Clerk test user + either `chromium-cli` or Playwright, so every module's frontend can actually be
> visually verified in a browser instead of the type-check-and-curl-only verification this session
> had to fall back to twice for lack of this. Only touch the files listed under "Track 4" — never a
> module's router/agents/model files. Log decisions to `.agents/decisions.md`.
