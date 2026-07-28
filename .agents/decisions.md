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

**All 5 roles land on `/dashboard` — as ONE shared route, not one per role group. See the routing
collision entry below for why.** Originally planned as a `/dashboard` page inside each of the 5
role groups (`(candidate)`, `(recruiter)`, `(organizer)`, `(judge)`, `(admin)`) for a uniform
post-login target, since `doc/multi-agent-architecture/10` §1 only lists an explicit `/dashboard`
for candidate and recruiter. Superseded by the fix below before any of those files were built.
→ `apps/web/src/app/dashboard/page.tsx`

**Routing collision: Next.js route groups don't add URL segments, so per-role `dashboard/` folders
would collide.** `(candidate)/dashboard/page.tsx` and `(recruiter)/dashboard/page.tsx` both resolve
to the literal URL `/dashboard` — parenthesized route groups are invisible to the URL, they're
purely organizational. Confirmed empirically: creating both and running `npm run build` fails with
"You cannot have two parallel pages that resolve to the same path." This wasn't just a candidate/
recruiter problem — it would have tripled once organizer/judge/admin dashboards were added too.
Doc 10's entire folder structure uses this same parenthesized-group pattern everywhere else
(`(recruiter)/jobs/new`, `(judge)/evaluations`, etc.) without collisions, because those leaf names
are unique across groups — `dashboard` is the one name reused across roles.
**Decision: one shared `/dashboard` route, living directly under `src/app/dashboard/` (outside any
role group), not five.** It reads the signed-in user's role server-side (via `/me`) and renders
role-specific placeholder content from there — same pattern used to redirect signed-out/
not-yet-onboarded users. Fully satisfies "land on the correct empty dashboard" per role without
restructuring the rest of the app to add role prefixes to every URL (which would have been the
other valid fix, but a much bigger deviation from doc 10's apparent intent of clean, non-prefixed
URLs everywhere else). Each role group's own `(candidate)/`, `(recruiter)/`, etc. folders remain
for their OTHER pages (assessments, jobs, evaluations, ...) — those don't collide since their leaf
names are unique per group; add that group's `layout.tsx` auth/role guard when its first real page
gets built in Phase 1, not now (nothing to guard yet).
→ `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/lib/api.ts`

**Clerk env var names**: `.env.example` originally used generic `AUTH_PUBLISHABLE_KEY`/
`AUTH_SECRET_KEY` names. Clerk's SDKs expect specific names
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — added those alongside the generic ones
rather than replacing them, since the generic names still describe the intent for a future
non-Clerk swap.
→ `.env.example`

**Dev database switched from local docker-compose Postgres to Neon (managed), per user request.**
Both docs describe local Docker as the dev default and a managed provider (Neon/Supabase) as the
prod target — the user chose to develop directly against Neon instead. Two driver-specific wrinkles
this surfaced: (1) Neon's connection string uses the plain `postgresql://` scheme with libpq-style
`sslmode`/`channel_binding` query params, which the app's asyncpg driver doesn't understand the
same way (asyncpg takes an `ssl` connect arg, not a `sslmode` URL param); (2) the given endpoint is
Neon's pooled (`-pooler`) hostname, which breaks asyncpg's default server-side prepared-statement
caching (PgBouncer-style transaction pooling doesn't support it) — needs `statement_cache_size: 0`.
Added a `DATABASE_SSL_REQUIRED` setting: when true, `services/api/core/db.py` passes
`connect_args={"ssl": True, "statement_cache_size": 0}` to the asyncpg engine, and
`packages/db/migrations/env.py` appends `?sslmode=require` to the sync (psycopg) URL used for
migrations instead (psycopg understands that param natively). Local docker-compose Postgres is
untouched and still defined in `infra/docker-compose.yml` for anyone who wants to switch back —
just point `DATABASE_URL` at it and set `DATABASE_SSL_REQUIRED=false`.
→ `services/api/core/config.py`, `services/api/core/db.py`, `packages/db/migrations/env.py`, `.env`
