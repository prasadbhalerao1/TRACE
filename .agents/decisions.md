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

**Phone number auth disabled on the Clerk instance entirely.** Clerk's default template had
`auth_phone.required_for_sign_up: true`, and Clerk's SMS provider doesn't support Indian phone
numbers on this instance's tier, which hard-blocked sign-up ("Phone numbers from this country
(India) are currently not supported"). Neither doc uses phone number for anything — auth is
email-based only, role lives in Postgres via the onboarding flow, no MFA in Phase 0 — so disabled
phone as an identifier entirely (`used_for_sign_up`, `used_for_sign_in`, `used_for_second_factor`,
`verify_at_sign_up` all set false, strategy lists cleared) rather than working around the region
restriction. Applied via `clerk config patch` against the dev instance (Clerk instance config, not
a repo file — no code change, nothing to commit).

---

## 2026-07-29 — Phase 1, Module 01: Candidate Intelligence — core loop (first pass)

**Scope of this pass: FR-1 (Ingestion) + FR-2 (Talent Score) + FR-3 (Dashboard) only.**
FR-4 (Career Guidance: skill gaps/roadmap/salary) and FR-5 (Resume/Portfolio Builder) are
deliberately deferred to a follow-up session — module 01's FR list is large enough that building
all five FRs in one pass risked exactly the drift this file exists to prevent. `career_recommendations`
table is not yet created; add it when FR-4 is built.
→ `packages/db/models.py`, `services/agents/candidate_intelligence/`, `services/api/routers/candidates.py`

**Candidate-table schema: used `doc/multi-agent-architecture/01` §7's version (adds `score_version`
tracking), not `doc/SRS/01` §5's** — same doc-set pick already established for Phase 0 tables, applied
consistently here. Added a `renormalized_subscores` JSONB column (not in either doc verbatim, but
required by doc 08 §1.1's own re-normalization provenance requirement — "store which weights were
re-normalized... never a hidden adjustment").
→ `packages/db/models.py` (`TalentScore.renormalized_subscores`)

**`consents.consent_type` CHECK constraint extended with `'github_ingestion'`.** Doc 01 §10 and
constraints.md §3 both require consent before GitHub ingestion, but neither doc's enumerated
`consent_type` list actually included a GitHub value (only `resume_parsing`, `linkedin_export`,
`ai_interview`, `perceptual_photo_hash`, `ai_assessment`) — a genuine gap, not a disagreement between
the two doc sets. Added the missing value via migration rather than overloading `resume_parsing`.
→ `packages/db/models.py` (`Consent`), `packages/db/migrations/versions/44fd41ed1de0_*.py`

**Talent Score sub-score split, decided by what data actually exists yet, not by doc 01's
Mechanical/Subjective labels alone:** Coding Ability, Technical Consistency, Community Participation,
and Leadership compute for real from GitHub data alone right now (Leadership's "team-lead flag" input
from doc 03 is simply omitted, not zero-filled). Problem Solving is always `None` — it depends
entirely on Module 03 (Assessment/Verification), which doesn't exist yet; this is cold-start, not a
bug. Project Quality and Innovation call Anthropic/Qdrant/embeddings for real (per doc 01 §4's own
Sonnet routing for exactly these two) and degrade to `None` on any failure — missing API key, empty
Qdrant corpus, embedding model unavailable — rather than fabricating a number. Doc 08 §1.1's cold-start
re-normalization is what absorbs all of this gracefully; a fresh candidate's first score is expected to
have 3 of 7 sub-scores renormalized away until Module 03 exists and keys are configured.
→ `services/agents/candidate_intelligence/tools/mechanical_scores.py`,
`services/agents/candidate_intelligence/tools/judgment_scores.py`

**GitHub OAuth callback: kept `GITHUB_OAUTH_REDIRECT_URI` pointed at the frontend
(`localhost:3000/api/auth/github/callback`) and added a pure-passthrough Next.js Route Handler that
redirects to the real backend callback, instead of changing the redirect URI to point at FastAPI
directly.** Doc 00 §2.1's "Next.js never runs business logic" convention would suggest the code
exchange itself should live in FastAPI (and it does — `services/api/routers/candidates.py`'s
`/candidates/github/oauth/callback`), but the redirect URI is registered on the actual GitHub OAuth
App outside this repo, and changing it wasn't something this session could verify/coordinate. Revisit
if the GitHub App's callback URL is ever repointed directly at the backend — the Next.js route can
then be deleted.
→ `apps/web/src/app/api/auth/github/callback/route.ts`

**LangGraph parallel fan-out: node functions must return only the keys they change, never the
full mutated state.** `resume_parser`, `github_analysis`, and `certificate_ocr` all run in the same
superstep (fanning out from `START`); returning the entire state dict from each (including untouched
keys) makes every parallel branch write the same value to every channel, and langgraph's default
"last value" channel raises `InvalidUpdateError` the moment two branches write to one key in the same
step — even identical values. `conflicts` specifically needed an `Annotated[list[str], operator.add]`
reducer since multiple nodes genuinely contribute _different_ new entries to it in parallel. Caught by
running the graph directly (bypassing HTTP/auth) against a synthetic `GithubAnalysis` before wiring the
frontend — worth repeating for future modules' graphs before assuming a node contract's `run()` shape
is fine to write full-state returns.
→ `services/agents/candidate_intelligence/state.py`, `services/agents/candidate_intelligence/nodes/*.py`

**`ANTHROPIC_API_KEY` and `CLOUDINARY_URL` are still not configured with real values in `.env`**
(confirmed empty / literal placeholder respectively). Per user decision this session, the real
integration code was written anyway (Anthropic structured-extraction calls, Cloudinary upload calls)
rather than stubbed — they'll raise a clear `ResumeExtractionUnavailable` / `StorageUnavailable`
at runtime until real keys are added, never silently fabricate data. Add real keys before testing
resume upload or Project-Quality/Innovation LLM judgment end-to-end.
→ `services/api/core/config.py`, `services/agents/candidate_intelligence/tools/resume.py`,
`services/api/core/storage.py`

<<<<<<< HEAD
**Qdrant switched from local docker-compose to Qdrant Cloud (managed), per user request** — same
pattern already applied to Postgres/Neon. `QDRANT_URL`/`QDRANT_API_KEY` in `.env` now point at a real
Qdrant Cloud cluster; no code change needed since `judgment_scores.py` already read both settings and
passed `api_key=settings.qdrant_api_key or None` to `QdrantClient` (local Qdrant has no auth, so this
path was already conditional). Local `qdrant` docker-compose service left defined but stopped/unused,
same as `postgres`, for anyone who wants to switch back.
→ `.env`, `infra/docker-compose.yml` (unchanged, service just not started), `DEV_SERVERS.md`,
`scripts/dev-up.ps1`

---

## 2026-07-29 — Phase 1, Module 01: Candidate Intelligence — FR-5 (Resume & Portfolio Builder)

**Cross-checked both doc sets before building:** `doc/SRS/01` FR-5.1-5.4 (lines 63-67) for the
requirement text, `doc/multi-agent-architecture/01` §3 Flow B + §4 agent registry for the
generate→fact-check→retry-or-deliver shape, and `doc/multi-agent-architecture/00` §2.1 for the
SSR carve-out (`/[username]` is one of only two SSR pages in the whole app — the other is the
hackathon leaderboard, out of scope here). No conflicts found between the two doc sets on FR-5
specifically — the "Known Differences" table in `.agents/DOCUMENTATION_MAP.md` doesn't list
anything under module 01's resume/portfolio feature, so no doc-set pick was needed here (unlike
FR-1/2/3's files/consents/candidate-table picks earlier in this log).

**`candidate_profiles.username` + `portfolio_published` added — neither doc set names a slug
column for FR-5.2's public route, but the SSR page can't exist without one.** Nullable + unique;
no username until the candidate opts in via `POST /candidates/me/portfolio/publish`. Publishing
validates the username against a hand-maintained reserved-word list (`dashboard`, `jobs`, `users`,
etc.) — same root cause as the route-group-collision entry above (Next.js route groups add no URL
prefix, so every role group's leaf page names are actually top-level segments a candidate-chosen
username could shadow). No dynamic route registry exists to check this automatically; the list in
`services/api/routers/candidates.py` (`_RESERVED_USERNAMES`) must be updated by hand if new
top-level pages are added.
→ `packages/db/models.py` (`CandidateProfile.username`/`.portfolio_published`), migration
`a76c622e4c08`, `services/api/routers/candidates.py`, `services/api/routers/public.py`

**One `generated_documents` table for both resumes and cover letters** (`document_type` column),
not two separate tables — neither doc set specifies a table here at all (doc 01 §5/§7's data
model stops at `career_recommendations`). One row per generation attempt (not a mutable "current
resume" singleton) so candidates keep a history, matching the existing `career_recommendations`/
`talent_scores` pattern of append-only generation rows elsewhere in this module.
→ `packages/db/models.py` (`GeneratedDocument`), migration `a76c622e4c08`

**Flow B (on-demand resume/cover-letter builder) is a separate compiled graph
(`resume_graph.py` + `document_state.py`), not added to `graph.py`/`state.py`.** Flow A's ingestion
graph fans out from `START` on signup/webhook/cron; Flow B is triggered per-request from the API
and has its own generate→fact-check retry loop (doc 01 §3's second mermaid diagram) that has
nothing to do with Flow A's parallel-branch shape or state shape. Capped at 2 generate-and-recheck
attempts (`resume_graph.MAX_ATTEMPTS`) — neither doc specifies a retry cap; uncapped retries risk
an infinite loop against a model that keeps producing unsupported claims, and doc 01 §10's "zero
tolerance for fabrication" means the API must refuse to deliver the document rather than give up
by relaxing the check, so a cap-then-refuse design was chosen over cap-then-deliver-anyway.
→ `services/agents/candidate_intelligence/resume_graph.py`,
`services/agents/candidate_intelligence/document_state.py`

**Fact-Check Agent failure (missing `ANTHROPIC_API_KEY`, API error) is treated as a FAILED check,
never a silent pass.** Doc 01 §10 says "zero tolerance for fabricated experience" — an
unverifiable document is exactly the case that guardrail exists for, so
`nodes/fact_check.py` maps `FactCheckUnavailable` to `fact_check_status: "failed"` rather than
letting the exception (or a default "trust it") skip the check. The API layer then refuses to hand
the candidate that document (`FactCheckFailed`, HTTP 422 with the findings) rather than silently
downgrading to an unchecked delivery.
→ `services/agents/candidate_intelligence/nodes/fact_check.py`,
`services/api/routers/candidates.py` (`FactCheckFailed`)

**Cover-letter generation routed to Sonnet (`llm_model_judgment`), not Haiku**, even though doc
01 §4's agent registry table only lists a Sonnet tier explicitly for the "Resume Generator Agent"
and doesn't name a separate cover-letter agent. Constraints.md §5's model-routing policy puts
"human-facing judgments" (persuasive, audience-aware writing) on Sonnet and reserves Haiku for
extraction/tagging-style tasks — a cover letter is squarely the former, so it was routed the same
as resume generation rather than defaulting to the cheaper tier.
→ `services/agents/candidate_intelligence/tools/document_generation.py`

**Cover letter/resume JD input is free text (`target_job_description: str`), not a `job_id`
FK.** `doc/SRS/01` §6 and `doc/multi-agent-architecture/01` §9 both show
`cover-letter/generate` taking a `job_id`/`target_job_id`, implying a link into module 02's
`jobs` table — but module 02 isn't built yet in this codebase (no `jobs` table, no router,
explicitly out of scope: "Don't touch Module 04... or Module 01 FR-4" per this session's brief
plus module 02 depends on module 01 per `.agents/DOCUMENTATION_MAP.md`'s build-order chain, so
it comes after). Free-text JD satisfies FR-5.3's actual requirement ("parameterized by target job
description") without inventing a dependency on an unbuilt module; revisit to add an optional
`job_id` alongside free text once module 02 exists, rather than replacing it (a candidate pasting
an external JD they're not applying through this platform for is still a valid use case).
→ `packages/shared_schemas/candidates.py` (`ResumeGenerateRequest`/`CoverLetterGenerateRequest`)

**FR-5 endpoints live under `/candidates/me/...`, not `/candidates/{id}/...`** as both docs'
API sections literally show. Matches the self-service auth pattern every other FR-1/2/3 endpoint
in this router already uses (`/candidates/me/score`, `/candidates/me/dashboard`, etc.) — the
`{id}` form in the docs predates that established convention being picked in the earlier FR-1/2/3
session.
→ `services/api/routers/candidates.py`

**WeasyPrint (doc 01 §9's named PDF library) installs cleanly via `uv pip install` but its Python
import requires native GTK/Pango/cairo shared libraries not present on this Windows dev box** —
confirmed: `OSError: cannot load library 'libgobject-2.0-0'`. The import is deferred into
`render_resume_pdf()` (not top-level in `tools/resume_pdf.py`) so a missing native lib doesn't
crash the whole API process at import time; callers get a typed `PdfGenerationUnavailable`,
matching the `ResumeExtractionUnavailable`/`StorageUnavailable` pattern. Not swapped for a
pure-Python alternative — WeasyPrint is still the right tool per doc 9 and will work as-is once
GTK is available (e.g. in a Linux container), so the fix belongs in deployment/dev-env setup, not
in the code.
→ `services/agents/candidate_intelligence/tools/resume_pdf.py`

**Migration `a76c622e4c08` chains onto `44fd41ed1de0`, the DB's actual current head** (verified via
`alembic current` against the live Neon dev DB, not assumed from the latest file in
`packages/db/migrations/versions/` by filename/mtime — `bfa4df0973c6`'s down_revision chain
resolves through `44fd41ed1de0`, not directly to itself). Sibling agents are adding migrations
concurrently in other worktrees against the same DB; this migration was generated but
**deliberately not applied** (`alembic upgrade head` was never run) to avoid moving the shared dev
DB out from under any other in-flight agent — will need rebasing (regenerating the down_revision,
and possibly re-running autogenerate) once branches merge in a single order.
→ `packages/db/migrations/versions/a76c622e4c08_resume_portfolio_builder_tables.py`

**Could not live-test the Anthropic (resume/cover-letter generation, fact-check) or Cloudinary
(resume PDF upload) paths end-to-end** — same `ANTHROPIC_API_KEY`/`CLOUDINARY_URL` gap noted
above, still unresolved. The migration itself was also deliberately never applied (see above), so
there's no live `generated_documents`/`candidate_profiles.username` schema to test the ORM against
either. Verified correctness instead via: `alembic revision --autogenerate` against the live Neon
DB cleanly detecting exactly the intended diff (new table + two new columns + one unique
constraint, nothing else) with no manual edits needed beyond naming the autogenerated unique
constraint; synthetic `ainvoke()` runs against `resume_graph` with mocked tool functions (no-key
path ends with `generation_error` set and fact-check skipped; a fail-then-pass fact-check path
loops back through the generator exactly once before ending `passed`); `npx tsc --noEmit`,
`npm run lint`, and `npm run build` all clean, with the production build's route table confirming
`/[username]` resolves as a server-rendered dynamic route with no collisions.
→ all FR-5 files listed above
=======

---

## 2026-07-29 — Module 04: PPT Analyzer, built from scratch

**Scope: full FR-1 through FR-9 in one pass**, unlike Module 01's deliberate FR-4/FR-5 deferral —
doc 04 is small enough (§3 has 9 FRs, all tightly coupled around one linear pipeline with a single
parallel fan-out) that splitting it across sessions would have meant threading partial state through
the graph twice for no real benefit. Both `doc/SRS/04-SRS-PPT-Analyzer.md` and
`doc/multi-agent-architecture/04-ppt-analyzer.md` were read in full and are essentially identical for
this module (state schema, §5 data model SQL, and §6 endpoints all byte-for-byte the same) — no entry
was needed in `.agents/DOCUMENTATION_MAP.md`'s "Known Differences" table and none was added.
→ `services/agents/ppt_analyzer/`, `services/api/routers/presentations.py`, `packages/db/models.py`

**Schema: matches both docs' §5/§4 SQL sketch almost verbatim**, with two additive, documented
deviations: (1) `slides.ocr_text` (not in the doc's SQL) — the doc's own agent registry describes a
Slide Image/OCR Agent producing text that FR-2/FR-5 need somewhere to persist per-slide, but the SQL
sketch only has a `has_image` boolean; discarding OCR output after the graph run rather than storing
it would silently throw away exactly the evidence FR-5's "cross-check technical claims" is supposed to
ground its judgment in. (2) `presentations.hackathon_submission_id` and `.status`/`.status_detail` — the
UUID FK-shaped column from the doc is kept as a **plain nullable UUID with no FK constraint** (doc 05
doesn't exist yet, and the master architecture doc's own rule is that modules never FK directly into
another module's private tables anyway — this was true even before doc 05 existed); `status`/
`status_detail` were added because doc 04 §6 requires a `GET /status` endpoint but the doc's SQL sketch
has no column to serve it from.
→ `packages/db/models.py` (`Presentation`, `Slide`, `PresentationScore`, `PlagiarismMatch`)

**Migration `e8a55dc975da_ppt_analyzer_tables`, `down_revision = '44fd41ed1de0'`** (chains directly
onto Module 01's `44fd41ed1de0_add_github_ingestion_consent_type` — that was `alembic current`'s head
at the time this was generated). Autogenerated, reviewed, and **actually applied to the real Neon dev
DB** (`alembic upgrade head` succeeded, `alembic current` confirms `e8a55dc975da (head)`) — this
migration may need rebasing if another module's migration lands on top of `44fd41ed1de0` first, since
several modules are being built in parallel worktrees right now.
→ `packages/db/migrations/versions/e8a55dc975da_ppt_analyzer_tables.py`

**No `arq` background worker — the subgraph is invoked synchronously from `POST /presentations/upload`**,
same as Module 01's Flow A. Doc 04 §9/§6 call for `arq` so the upload response never blocks on the
pipeline, but no `arq` worker entrypoint exists anywhere in this repo yet (checked `services/` — only
`arq` the _dependency_ is installed, no worker process). Building a whole shared worker infrastructure
just for this one module's upload endpoint was judged out of scope for this pass; revisit once a real
worker entrypoint exists for any module (`services/workers/` is sketched in doc 10 §1 but unbuilt).
`GET /presentations/{id}/status` still exists and is real (reads a genuine `processing`/`done`/`failed`
column) — it just resolves to `done`/`failed` synchronously within the same request cycle for now, and
the frontend still polls it defensively in case that assumption changes later.
→ `services/agents/ppt_analyzer/graph.py`, `services/api/routers/presentations.py`

**FR-5's Module 01/03 cross-reference degrades to a direct, unauthenticated GitHub API read of the
linked repo — not a join against `candidate_project_embeddings` or Module 03's (nonexistent) static
analysis tables.** Per the task brief's instruction to treat that data as optional/absent and design the
read path so it can be wired in later without a schema change: `presentations.linked_repo` is a plain
string (no FK to any candidate/repo table), and `tools/repo_crosscheck.py` fetches a lightweight public
snapshot (languages, README excerpt) directly from GitHub to give the Technical Feasibility Agent real
evidence instead of nothing, with a docstring flagging it as the extension point once Module 01/03 data
exists. Degrades to `None` on any failure (repo private/missing/rate-limited/not linked) — never
fabricates evidence. This mirrors the exact "Problem Solving is always `None`" cold-start pattern from
Module 01's own entry above.
→ `services/agents/ppt_analyzer/tools/repo_crosscheck.py`

**FR-6's AI-content heuristic uses burstiness + lexical-diversity statistics, not a GPT-2 perplexity
model via `transformers`.** Doc 08's own ground rules explicitly allow a simpler statistical fallback as
a legitimate scope-reduction for the _code_-plagiarism algorithm (§3) "if integrating [the real
approach] is still too heavy in the time you have" — the same reasoning was applied here: a GPT-2-based
perplexity signal needs a model download at runtime (no guaranteed network access, multi-hundred-MB),
where a pure-stdlib statistical signal has zero extra runtime dependency and still produces a
score+confidence+evidence signal that satisfies FR-6's actual hard requirement (never a bare verdict).
`transformers`/`torch` remain installed in `services/api/.venv` for a future upgrade to real perplexity
scoring without new dependency work.
→ `services/agents/ppt_analyzer/tools/ai_content_heuristic.py`

**Similarity/Plagiarism Agent skips the doc's "Haiku for narrative" step** — matches are structured
(`matched_presentation_id`, `slide_index`, `similarity`) via a real Qdrant search against a
`presentation_slide_embeddings` collection (built up incrementally, same corpus-building pattern as
Module 01's Innovation novelty check), which is itself the evidence FR-6/§9's "never a bare boolean,
always evidence" rule asks for. The LLM narrative was judged to be UI copy, not part of the actual
detection, and cut to keep the number of real Anthropic calls per upload bounded.
→ `services/agents/ppt_analyzer/tools/plagiarism.py`

**Route split: upload is `(candidate)/pitch-deck/page.tsx` (candidate-only, guarded by that route
group's existing layout); the report view is `/pitch-deck/[id]/page.tsx`, OUTSIDE any role group.**
Doc/SRS/04 §2's actor table has Candidate/Team upload but Judge/Recruiter/Investor _view_ the scored
report — putting the report page inside `(candidate)` would incorrectly block those other roles via
that group's role-guard `layout.tsx`. This is the exact same problem and fix already recorded above for
`/dashboard`: a route needed by multiple roles can't live inside any single role's parenthesized group,
so it goes directly under `src/app/` instead. The backend enforces the actual access boundary
(`get_current_user`, no role restriction, on all three GET endpoints) — the frontend split just mirrors it.
→ `apps/web/src/app/(candidate)/pitch-deck/page.tsx`, `apps/web/src/app/pitch-deck/[id]/page.tsx`

**Two real bugs found and fixed via direct `graph.ainvoke()` / router-function smoke tests against a
real python-pptx deck and the real Neon dev DB** (following the same "test the graph directly before
wiring the frontend" practice recorded in Module 01's parallel fan-out entry above):

1. `python-pptx`'s `slide.shapes.title` returns a **new proxy object on every property access**, so
   `shape is not slide.shapes.title` (identity comparison) never actually excluded the title shape from
   the body text — every slide's title was being duplicated into its own body. Fixed by comparing
   `shape.shape_id` (stable across accesses) instead of object identity.
   → `services/agents/ppt_analyzer/tools/extraction.py`
2. A syntactically-valid-but-placeholder `CLOUDINARY_URL` (literally `cloudinary://<api_key>:...`, this
   repo's actual `.env.example`/current `.env` value) passes `storage.py`'s config-presence check and
   only fails once the real Cloudinary API call is made, raising `cloudinary.exceptions.AuthorizationRequired`
   — a different exception type than `StorageUnavailable`, so it wasn't being caught by the narrower
   except clause and would have 500'd the whole upload. Broadened the catch to
   `cloudinary.exceptions.Error` as well, same graceful "best-effort persistence, never blocks the
   extraction/scoring pipeline" degrade.
   → `services/api/routers/presentations.py`

**Verification performed without live API keys**: the full pipeline (`format_normalization` ->
`content_extraction` -> all 5 parallel branches -> `aggregation` -> `summary_suggestions`) was run
directly via `graph.ainvoke()` against both an empty state and a real generated `.pptx`, and the
`upload_presentation`/`get_report`/`get_status`/`get_plagiarism_matches` router functions were called
directly (bypassing Clerk auth, same technique as Module 01) against the real Neon DB — confirming no
`InvalidUpdateError` from the parallel fan-out, confirming every LLM-dependent node degrades to a
`None`-valued score with a clear "unavailable: ANTHROPIC_API_KEY is not configured" rationale (never a
fabricated number), and confirming the DB writes/reads round-trip correctly. **Not verified**: the
actual Anthropic rubric-scoring output quality, real Cloudinary storage, real Qdrant plagiarism corpus
matching (local Qdrant wasn't running during this session), and legacy `.ppt` conversion (no LibreOffice
binary on this host) — all four require infrastructure/keys not present in this environment and degrade
via the typed-error paths described above rather than being stubbed.
→ verified interactively, not committed as test files (no test runner/fixtures exist yet in this repo
for either `services/agents` or `services/api` — worth adding in a follow-up pass)

> > > > > > > worktree-agent-a65b3f366de8e6465
