# Implementation Decisions Log

Running log of decisions made during real implementation that deviate from, fill gaps in, or pick
between the two doc sets (`doc/SRS/` and `doc/multi-agent-architecture/`). Feed this file into
every future session alongside the module docs so decisions stay consistent across sessions, not
just within one — per the project's own Phase 2 rules on avoiding drift.

Format: date, decision, why, where it lives in code.

---

## 2026-07-29 — Phase 0: Foundation

**Shared core schema: use `doc/multi-agent-architecture/00` §4's table shapes, not `doc/SRS/00` §5's.**
Both are otherwise identical (`organizations`, `users`, `events`, `agent_runs`, `audit_logs`), but
they disagree on `files` (SRS keeps a `storage_provider` enum including `r2`; multi-agent-architecture
drops it — Cloudinary-only) and `consents` (`consent_type` value `voice_interview` vs
`ai_interview`). The multi-agent-architecture doc's version is that doc's own explicit "fix log"
revision of these same tables (§5 "What Changed From v1"), and matches the Cloudinary-only /
Web-Speech-API-only decisions already baked into `.env.example`.
→ `packages/db/models.py`

**SQLAlchemy ORM models live in `packages/db/models.py`, not under `services/api/` or `services/agents/`.**
Neither doc specifies where ORM models (as opposed to Pydantic schemas) should live. Since both
`services/api` and (eventually) `services/agents` read/write the same tables, and Alembic's
`env.py` needs one `target_metadata` to autogenerate against, a single shared models file avoids
hand-duplicating table definitions in two places.
→ `packages/db/models.py`, imported by `packages/db/migrations/env.py`

**Role assignment: self-serve onboarding page after Clerk sign-up.**
Neither doc says how a new Clerk sign-up gets a `users.role` assigned (role lives in Postgres, not
Clerk metadata, and there's no per-role sign-up link — doc 10 lists one generic `/sign-up` page).
Decided with the user: after Clerk sign-up, if no matching `users` row exists yet, redirect to a
role-picker page; submitting creates the row. Revisit if/when an invite-based or admin-provisioned
flow becomes necessary (e.g. recruiters belonging to a specific `organization_id`).
→ `apps/web/src/app/(public)/onboarding/page.tsx`, `services/api/routers/users.py` (`POST /users/onboarding`)

**All 5 role groups get a `/dashboard` landing page, not just candidate/recruiter.**
`doc/multi-agent-architecture/10` §1 only lists an explicit `/dashboard` page for candidate and
recruiter — organizer/judge/admin's first-listed routes are `hackathons/new`, `evaluations`, and
`fraud-review` respectively. For a uniform post-login redirect target across all 5 roles, added a
`/dashboard` page to organizer/judge/admin too. Doesn't contradict the doc, just fills a gap it
left open.
→ `apps/web/src/app/(organizer|judge|admin)/dashboard/page.tsx`

**Clerk env var names**: `.env.example` originally used generic `AUTH_PUBLISHABLE_KEY`/
`AUTH_SECRET_KEY` names. Clerk's SDKs expect specific names
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — added those alongside the generic ones
rather than replacing them, since the generic names still describe the intent for a future
non-Clerk swap.
→ `.env.example`
