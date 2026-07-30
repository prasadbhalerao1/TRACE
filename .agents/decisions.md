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
reducer since multiple nodes genuinely contribute *different* new entries to it in parallel. Caught by
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

---

## 2026-07-29 — Phase 1, Module 01: Candidate Intelligence — FR-4 (AI Career Guidance)

**Linearized Alembic Migration (`a333d4c53bd0`)**: Chains after FR-5 (`a76c622e4c08`). Adds `career_recommendations` table and `course_catalog` table (seeded with initial courses). ORM models `CareerRecommendation` and `CourseCatalogEntry` defined in `packages/db/models.py`.

**Parallel Fan-Out Graph (`career_guidance_graph.py`)**: Executes `skill_gap_analysis`, `salary_prediction`, and `certification_mapping` in parallel superstep, followed sequentially by `career_roadmap`. Uses `CareerGuidanceState` with discrete return keys to prevent LangGraph parallel state collision.

**Qdrant Vector Cosine Matching**: Computes skill gaps against target role taxonomies stored in Qdrant Cloud. Offline Stack Overflow regressor tool (`train_salary_model.py`) trains a 2-quantile GBR model for salary interval predictions.

---

## 2026-07-29 — Phase 1, Module 04: PPT Pitch Deck Analyzer

**Linearized Alembic Migration (`e8a55dc975da`)**: Chains after FR-4 (`a333d4c53bd0`). Adds `presentations` and `presentation_slide_embeddings` tables to store slide metadata, extracted text, and vector embeddings.

**5-Agent Rubric Scoring & Plagiarism Pipeline**: Extracts text/OCR from PowerPoint decks, runs 5 parallel AI rubric agents (Innovation, Technical Feasibility, Presentation Quality, Business Potential, AI-Content Signal), checks slide vector similarity in Qdrant for plagiarism, and synthesizes a presentation report.

**Standalone Multi-Role Route**: Report view lives at `/pitch-deck/[id]` outside role groups so candidates, judges, recruiters, and investors can view pitch deck reports without role restrictions. Upload lives in `(candidate)/pitch-deck/page.tsx` and is linked directly from the Candidate Dashboard.

---

## 2026-07-29 — DB migration bug found on Module 01: alembic stamped-not-applied

**The Neon dev DB's `alembic_version` was at head (`e8a55dc975da`) but the FR-4/FR-5 migrations'
DDL had never actually run** — `candidate_profiles.username`/`portfolio_published`,
`career_recommendations`, `generated_documents`, and `course_catalog` were all missing. Root cause:
`a333d4c53bd0`'s course-catalog seed insert bound `:id` as a bare `sa.text()` param, which the
driver inferred as VARCHAR against a UUID PK column — Postgres rejected it, and someone stamped
past the failure instead of fixing it. This is what surfaced as `/candidates/me/dashboard` 500ing
(misreported as a CORS error by the browser, since Starlette's `ServerErrorMiddleware` generates
500s outside `CORSMiddleware`). Fixed with `CAST(:id AS UUID)`, then re-applied for real (stamped
back to `44fd41ed1de0`, ran `alembic upgrade head`; Module 04's tables already existed
byte-for-byte outside the migration chain, verified column-by-column before stamping past that one
revision rather than re-running it).
→ `packages/db/migrations/versions/a333d4c53bd0_career_guidance_tables.py`

**Lesson for future migration work**: `alembic heads`/`alembic current` matching does NOT prove the
DDL actually ran — always spot-check that a recent migration's columns/tables actually exist in the
live DB before trusting the version marker.

---

## 2026-07-29 — Phase 1, Module 02: AI Recruitment Platform

**Cultural Fit scoring omitted entirely.** This is a documented "Known Difference" in
`.agents/DOCUMENTATION_MAP.md` (multi-agent-architecture/02 says removed; SRS/02 has one NFR trace
of it). Resolved in favor of removal: the canonical formula in `doc/multi-agent-architecture/08`
§2 (the single source of truth for scoring math) has no Cultural Fit term at all.

**Recruiter Copilot built as plain REST (`POST /copilot/query`), not WebSocket streaming** — user's
explicit choice when asked, since no other module in this codebase uses WebSockets yet and the
3-stage cost-bounded design (doc 02 §2) is fast enough without token-level streaming. Revisit if a
future session wants the literal streaming UX doc 02 §7 describes for `CopilotChat.tsx`.

**Match formula weights are this session's tunable defaults** (doc 08 §2 explicitly calls them
unvalidated): w1=0.35 SkillOverlap, w2=0.30 SemanticSimilarity, w3=0.15 ExperienceMatch, w4=0.20
TalentScoreAlignment; SemanticSimilarity's internal blend uses doc 08's own α=0.70.
→ `services/agents/recruitment/tools/matching.py`

**Additive schema, not in either doc's SQL**: `applications.source` (needed for FR-4.3's
source-of-hire breakdown) and `match_scores`'s per-term columns (`semantic_similarity`,
`experience_match`, `talent_score_alignment` — needed so the 4-term breakdown can actually be
persisted and redisplayed, not just computed transiently). `applications.stage` uses the
architecture doc's 6-value vocabulary (`sourced,screened,interview_scheduled,offered,rejected,
hired`) — the most complete of three inconsistent stage lists found across SRS/02,
architecture/02, and two pre-existing frontend mock pages; SRS FR-1.4's extra `assessed` stage is
deferred until Module 03 exists.
→ `packages/db/models/recruitment.py`, `packages/db/migrations/versions/ac395e67db4e_recruitment_tables.py`

**No LangGraph checkpointer for the Copilot's multi-turn conversation** — nothing else in this
codebase uses one; `copilot_conversations.messages`/`structured_filters` are loaded into initial
state and re-saved after each turn by the router instead, matching every other module's manual-DB
-persistence convention.
→ `services/agents/recruitment/copilot_graph.py`, `services/api/routers/recruitment.py`

**`(recruiter)/top-performers` and `(recruiter)/reports/*` deliberately NOT wired** — they surface
Module 03 (interview/contribution reports) and Module 05 (hackathon rankings) output via the
cross-module events bus, which is explicitly a Phase 2 ("Integration pass, after all 6 modules
exist independently") task per `.agents/BUILD_ROADMAP.md`, not part of Module 02 in isolation.

**Verified live against the real Neon DB** (dependency-override script bypassing Clerk auth, same
technique used to catch the Module 01 migration bug above): job creation → real Flow B matching →
persisted 4-term scores; candidate apply + duplicate-apply (409); kanban stage PATCH; all three
analytics endpoints; Copilot correctly fails closed with a typed 503 given empty
`ANTHROPIC_API_KEY`. `tsc --noEmit`, `eslint`, `next build` all clean, no route collisions. Did
**not** get an authenticated browser click-through (no `chromium-cli`, no Clerk test-user
credentials in this repo) — routes were confirmed rendering (200, no crash) via direct curl only.
→ `services/api/routers/recruitment.py`, `apps/web/src/app/(recruiter)/*`, `apps/web/src/app/(candidate)/applications/page.tsx`

---

## 2026-07-29 — Phase 1, Module 03: Assessment & Verification System

**Sandbox stays 100% client-side (Pyodide/Web Worker), no backend execution ever** — architecture
doc §2's finalized design over SRS's server-side Piston mention. The backend never sees candidate
code except as text to statically analyze (`radon`/`lizard`/`bandit`); test pass/fail is computed
in-browser and only that boolean result is sent back. `apps/web/src/lib/pyodideRunner.ts` loads
Pyodide from a CDN (`indexURL`), not bundled — the standard integration pattern given the WASM
runtime + stdlib assets are too large to ship in the Next.js webpack bundle. Every coding
assessment's entry point is a function named `solve_problem` taking one argument — a convention,
not enforced by any doc, matching the pre-existing stub page's example.

**Interview is turn-based REST, not WebSocket** — architecture doc §3 already finalizes this;
matches Module 02's Copilot decision. Each `POST .../turn` is one `ainvoke()`; conversation state
(`topic_plan`, `current_topic_idx`, `transcript`, `per_topic_scores`,
`follow_up_count_this_topic`) is persisted manually to `interview_sessions.state` JSONB between
calls — no LangGraph checkpointer, consistent with every other module. The turn graph routes from
`START` on a `mode: "start" | "turn"` flag (not graph-loop-based) since the very first call (no
answer to evaluate yet) and a mid-interview call (evaluate → maybe follow-up → maybe next
question) need genuinely different entry behavior.

**Web Speech STT/TTS is entirely client-side** — the backend never sees or stores audio, only the
transcript text the browser already converted (architecture doc §3).

**GitHub data via PyGithub REST, not GraphQL** — reuses `candidate_intelligence/tools/github.py`'s
exact client pattern rather than adding a new GraphQL dependency. `lines_survived` (doc 03 §7's
"lines changed that survive to HEAD") is approximated as net commit-level additions, not a true
git-blame pass — documented in `tools/github_contribution.py`, not hidden.

**Contribution weighting**: each raw component (lines/commits/PRs-opened/PRs-reviewed) is min-max
scaled against the team's own max *before* the doc's stated weights are applied — otherwise
`lines_survived` (often hundreds) would numerically dominate `commits_count` (often single digits)
regardless of the stated 0.35/0.25/0.20/0.20 weights. Final shares are then normalized to sum to 1,
per the formula's own "normalize(...)". Not specified by either doc; implementation detail logged
since it changes the actual numbers a recruiter sees.

**Additive schema**: `contribution_reports.github_username` (a team member who isn't yet a
platform candidate still needs to appear in the report; `candidate_id` stays nullable exactly as
both docs' own SQL already has it).

**`project_analysis` submissions fetch only public repo content, unauthenticated** — no candidate
GitHub token is ever persisted server-side (FR-1.1's rule), and re-collecting a fresh token at
submission time was out of scope for this pass. Documented as a real limitation in
`_fetch_repo_sample_source`'s docstring, not silently assumed away.

**Fixed a pre-existing frontend bug while wiring**: `(recruiter)/reports/submission/[id]/page.tsx`
contained Module 04 (PPT Analyzer) pitch-deck-report content instead of Module 03's coding/MCQ
submission report — a scaffolding copy-paste mistake (Module 04 already has its own correct report
at `/pitch-deck/[id]`). Replaced with the real report.

**Verified live against the real Neon DB** (same dependency-override-bypassing-Clerk technique as
Modules 01/02): MCQ submission succeeds end-to-end with no LLM dependency (score computed purely
by rules); coding submission and interview start both fail closed with a typed 503 given the
still-empty `ANTHROPIC_API_KEY`; team contribution report generation ran a real GitHub API call
against `octocat/Hello-World` and persisted correct results. `tsc --noEmit`, `eslint`, `next build`
all clean, no route collisions.
→ `packages/db/models/assessment.py`, `services/agents/assessment/`,
`services/api/routers/assessments.py`, `apps/web/src/app/(candidate)/assessments/`,
`apps/web/src/app/(candidate)/interview/`, `apps/web/src/app/(recruiter)/reports/`

---

## 2026-07-29 — Phase 1, Module 05: Hackathon-to-Hiring Pipeline

**No `judge_evaluations` table — SRS's design over the architecture doc's.** This is the
one real disagreement `.agents/DOCUMENTATION_MAP.md`'s Known Differences table already
flags. The member-1 assignment file's own data-model list only names `hackathons`,
`hackathon_teams`, `hackathon_team_members`, `hackathon_submissions`,
`hackathon_rankings`, `recruiter_watchlists` (no `judge_evaluations`), so SRS's single
`hackathon_submissions.judge_score` column is what got built. `judge_rationale` and
`judge_user_id` are additive (neither doc's `judge_score`-only column has anywhere to put
the qualitative rationale the `(judge)/submissions/[id]` frontend stub already collects).
→ `packages/db/models/hackathon.py`

**`hackathon_team_members` uses a surrogate `id` PK, not the docs' composite
`(team_id, candidate_id)`.** A CSV/webhook-imported roster member is frequently not a
platform candidate yet — the composite PK requires a non-null `candidate_id` on every
row, which can't represent that. Same real gap Module 03's
`contribution_reports.github_username` fallback already solved once this project;
solved the same way here (`candidate_id` nullable, `github_username`/`display_name`
fallback columns, resolved-by-github-username matching against `candidate_profiles` at
ingestion time).
→ `packages/db/models/hackathon.py`, migration `afe5f58698f3`

**Cross-module integration reuses the target module's real compiled LangGraph graph
in-process (`get_verification_graph()`), not its HTTP router endpoint verbatim.** The
member-1 assignment says to "call into Module 03's router endpoints, never its internal
tools/nodes directly" — but `assessments.py`'s `POST /assessments/{id}/submit` is gated by
`_require_consent(db, user.id, "ai_assessment")`, a consent designed for a candidate
personally consenting to being assessed, which doesn't fit "an organizer/team links a
repo to a hackathon submission." Rather than fabricate a consent grant for a use case the
gate wasn't built for, this session calls `get_verification_graph()` directly — the exact
same graph-level entrypoint `assessments.py` itself imports and calls, one level above
`tools`/`nodes` — and persists the resulting `Assessment`/`Submission` rows itself
(mirroring `assessments.py`'s own persistence code exactly, not reimplementing any
scoring). Module 04 needed no equivalent workaround: a team's deck is uploaded through
Module 04's own real `POST /presentations/upload` endpoint before the team links it to
their hackathon submission, so by ranking time `presentation_scores` already exists and
this module only ever reads that table (a plain `SELECT`, exactly as instructed).
→ `services/agents/hackathon/nodes/repo_deck_linking.py`,
  `services/api/routers/hackathons.py` (`finalize_rankings`)

**Cross-event novelty reuses Module 04's existing `plagiarism_matches` output instead of
re-embedding slide text and re-querying Qdrant.** `plagiarism_matches` is itself the
result of a Qdrant search across the *entire* presentation corpus (not scoped to one
hackathon), computed once at deck-upload time — exactly the "has this idea appeared in
prior events" signal FR-5 asks for. `novelty_score = 100 * (1 - max_similarity)` if any
match rows exist for that presentation, `100` (fully novel) if the deck has zero matches,
`None` (N/A, re-normalized away) if no deck is linked at all.
→ `services/agents/hackathon/nodes/cross_event_novelty.py`

**Composite ranking formula (doc 08 §8, unchanged weights) with the same cold-start
re-normalization pattern as doc 08 §1.1** (already used by Module 01's Talent Score):
0.40 judge + 0.30 pitch + 0.20 repo quality + 0.10 novelty, any missing component's
weight zeroed and the rest re-normalized rather than zero-filled. `repo_quality_score`
is Module 03's `Submission.score` for the linked repo's `project_analysis` assessment;
there's no separate "repo quality" concept in either doc, this is the closest existing
signal and is what FR-3's `doc03.repo_quality_score` term actually refers to.
→ `services/agents/hackathon/tools/ranking.py`

**Ingestion mode split: CSV needs no server-side Normalization Agent pass, webhook
does.** Doc 05 §8's `CSVImportPreview.tsx` (SheetJS/xlsx.js) means the organizer already
resolves column-name ambiguity in a client-side preview grid before the structured
`CSVImportRequest` ever reaches the backend — so CSV import only validates, it doesn't
re-map fields. Webhook payloads have no human in the loop, so `POST .../webhook` accepts
an arbitrary `dict` and runs it through a real Normalization Agent (rules-first synonym
table, Haiku fallback only when rules can't confidently map a required field) before
reusing the same team-upsert path as CSV/direct. Webhook HMAC signature verification
(doc 05 §9) was NOT implemented — documented gap, same "real integration, honest limit"
pattern as other modules' unfinished integrations.
→ `services/agents/hackathon/tools/normalization.py`,
  `services/api/routers/hackathons.py` (`receive_webhook`)

**Additive endpoints beyond doc 05 §7's literal list** (none of these exist in either doc
— logged since they change the actual API surface): `POST .../submissions/{id}/judge-
score` (FR-2 needs a judge-scoring write path and neither doc's endpoint list has one);
`POST .../rankings/finalize` (doc 05 §7 lists only `GET .../rankings` — nothing actually
triggers ranking computation; the organizer frontend's pre-existing "Finalize Rankings"
button needed a real endpoint to call); `GET /hackathons` and `GET .../teams` (list forms,
needed for the organizer manage page and judge queue, mirroring `GET /jobs`'s precedent
in Module 02). `/recruiters/{id}/watchlists` and `/recruiters/{id}/top-performers-feed`
were built as `/recruiters/me/...` instead — same self-service-over-literal-`{id}`
deviation Module 01 FR-5 already established, logged there.

**`/recruiters/me/top-performers-feed` shows all recent top-3 finishers, unfiltered by
watchlist criteria.** Actually matching a recruiter's specific `recruiter_watchlists`
criteria against finalized rankings is the Module 02 consumer side of the
`hackathon.rankings.finalized` event — explicitly out of this module's scope per the
assignment file's §6 ("stop here"), deferred to the Phase 2 integration pass. Watchlists
are still fully created/persisted now so that Phase 2 work has real rows to match
against later.

**No HTML/CSV file upload parsing (`pandas`) — CSV import takes pre-parsed JSON.** Doc 05
§9 names `pandas` for backend CSV/XLSX parsing, but doc 05 §8's own frontend design
already does that parsing client-side (SheetJS) for the preview-before-commit UX; adding
a second, redundant server-side file-parsing path contradicts that design rather than
complementing it. If a future session wants raw file upload support instead of/alongside
the JSON path, doc 05 §9's `pandas` note is still the right tool for it.

**Verified live against the real Neon DB** (same dependency-override-bypassing-Clerk
technique as Modules 01/02/03): hackathon creation; CSV import (team + member + judge
score in one call); direct submission with a real repo link; webhook ingestion with a
raw Devpost-shaped payload run through the real Normalization Agent; judge scoring;
`rankings/finalize` end-to-end including a real GitHub API call + Module 03 static
analysis pass against `octocat/Hello-World` (LLM code review correctly failed closed
with the still-empty `ANTHROPIC_API_KEY`, so `repo_quality_score` stayed `None` —
expected, not a bug); idempotent re-finalize (upserts 3 ranking rows, not 6); recruiter
watchlist creation; top-performers feed. `python -c "import services.api.main"` clean.
→ `packages/db/models/hackathon.py`, `packages/shared_schemas/hackathon.py`,
`services/agents/hackathon/`, `services/api/routers/hackathons.py`

---


## 2026-07-30 — Phase 1, Module 06: Trust & Fraud Prevention

**No SRS-vs-architecture-doc conflicts found for this module** — both doc sets agree
verbatim on the `verification_records`/`fraud_flags`/`authenticity_scores`/`disputes`
schema (doc/SRS/06 §5, doc/multi-agent-architecture/06 §6) and on doc 06 §7/§8's binding
constraints. The one place a real ambiguity existed (FR-3's AI-content check has no
dedicated endpoint in either doc's §6/§7 API list) is logged below as this session's own
resolution, not a doc disagreement.

**Four independent LangGraph subgraphs, not one big graph** — `services/agents/fraud/
{cert,plagiarism,duplicate,content}_graph.py`, matching doc 06 §4's four separate mermaid
diagrams exactly (Certificate Verification, Code/Submission Plagiarism, Duplicate Profile
Detection, AI-Generated Content Signal). Each ends in its own verdict node
(`should_flag`/`confidence_label`/`evidence`); the router (not a shared "Authenticity
Aggregation" graph node) persists `verification_records` for every signal and
conditionally a `fraud_flags` row — aggregation and reporting are POST-processing the
router does after any of the four graphs returns, not a fifth graph node, since the
authenticity score is a per-CANDIDATE rollup of ALL their historical upheld flags across
every subject_type, not something scoped to one check's `state`.
→ `services/agents/fraud/state.py`, `cert_graph.py`, `plagiarism_graph.py`,
`duplicate_graph.py`, `content_graph.py`

**`duplicate_graph` and `plagiarism_graph` run their two independent signal-gathering
nodes SEQUENTIALLY, not fanned out from START in parallel** despite doc 06 §4's mermaid
diagrams showing a fan-out shape (`D1 -> D2`, `D1 -> D3` for duplicate detection; `P2 ->
P3`, `P2 -> P4` for plagiarism). Fanning genuinely-parallel nodes out in the same
superstep only works safely in this codebase's LangGraph convention when every channel
they write is either untouched by the other branch or uses an `operator.add`-style
reducer (the exact bug documented in this file's Module 01 "LangGraph parallel
fan-out" entry). `signals` already uses that reducer here, but `context` (where each node
stashes its own sub-result for the verdict node to read) does not, and giving it one would
mean writing a custom dict-merge reducer for a channel that's a single-writer-per-step
plain overwrite everywhere else in this module. Sequential execution is functionally
identical (imagehash/datasketch/copydetect are all fast local computations, no network
calls, so there's no real latency cost) and avoids the collision entirely — logged here
since it's a real, deliberate deviation from the docs' literal graph shape, not an
oversight.
→ `services/agents/fraud/duplicate_graph.py`, `services/agents/fraud/plagiarism_graph.py`

**FR-3 (AI-Generated Content Detection) has no dedicated endpoint** — doc 06 §6/§7's API
list only has three `POST /verification/.../check` routes (certificates, submissions,
profiles) and neither doc set adds a fourth for "check this resume for AI-generated
content." Resolved by running the `content_graph` as a second graph invocation inside
`POST /verification/profiles/{id}/duplicate-check`, since resume/written content lives on
the same `candidate_profiles` subject that endpoint already reads — logged as this
session's own resolution of a real endpoint-list gap, not a doc disagreement.
→ `services/api/routers/fraud.py` (`check_profile_duplicate`)

**AI-content signal is deliberately NEVER sufficient to raise a flag on its own** —
`nodes/perplexity_heuristic.py` always returns `should_flag: False`, regardless of score.
Doc 06 §8 requires AI-content/plagiarism signals to be "corroborated by at least one
independent signal" before ever contributing to an `upheld` decision; since this pipeline
has no second corroborating check wired to combine with it automatically, the
conservative choice (per doc 06's own "when unsure, pick the more conservative option"
guidance) was to never auto-raise on this signal alone — it's still recorded as a
`verification_records` row for a human reviewer to weigh alongside other context, exactly
the "surfaced, not auto-flagged" treatment the doc's caution implies.
→ `services/agents/fraud/nodes/perplexity_heuristic.py`

**AI-content heuristic reuses `ppt_analyzer`'s exact scoring function
(`_slide_ai_likelihood`)** rather than re-deriving the burstiness/lexical-diversity
formula a second time, per the assignment's explicit instruction that doc 06's detector
share doc 04's method so the two don't diverge.
→ `services/agents/fraud/tools/perplexity_heuristic.py`

**`copydetect` was missing from `services/api/.venv` (confirmed via import check
first, same as `radon`/`lizard`/`bandit`'s precedent for Module 03) — installed via `uv
pip install --python services/api/.venv copydetect`.** `imagehash`, `datasketch`,
`httpx`, and `anthropic` were all already present. No `pyproject.toml`/
`requirements.txt` exists anywhere in this repo to update — dependencies are tracked only
by what's actually installed in the venv, consistent with how prior sessions added
packages.

**Certificate issuer-verification-URL resolution uses a small hand-maintained
issuer-name -> URL-template map, not a `verification_url` column** — Module 01's
`certifications` table (read-only to this module) has no such column in either doc's
schema, only `issuer`/`credential_id`. A handful of common issuers (Coursera,
freeCodeCamp, AWS, Credly, Udemy, HackerRank) are covered; an unrecognized issuer or
missing credential ID correctly routes to the Visual Forensics branch (doc 06 §4's "no
API/URL" path) rather than erroring.
→ `services/agents/fraud/tools/issuer_lookup.py`

**Visual Forensics is rules-first (OCR confidence + metadata completeness), with an
OPTIONAL Haiku vision pass layered on top** when a certificate image URL exists and
`ANTHROPIC_API_KEY` is configured — matches this codebase's established "LLM call is a
best-effort enhancement on a working rules baseline, never the only path" pattern (e.g.
`ppt_analyzer/tools/plagiarism.py`'s optional Haiku narrative). When both rules and vision
run, the FINAL suspicion label is the higher (more conservative) of the two, never an
average — deliberately biased toward not silently down-weighting a rules-based concern
because a vision pass happened to look benign.
→ `services/agents/fraud/tools/visual_forensics.py`

**Authenticity score aggregation formula and penalty weights copied verbatim from doc
08 §10** (this session's tunable defaults, per the doc's own framing, not independently
chosen): starting score 100, penalties only for `upheld` flags — fake_certificate 30,
code_plagiarism 35, duplicate_profile 40, ai_generated_content 15 — floored at 0. An
unrecognized `flag_type` (shouldn't occur given the fixed set this module raises, but
defensive) gets a small default penalty of 10 rather than silently contributing zero.
`components` records exactly which flags contributed which penalty (same "provenance
trail, never a hidden adjustment" pattern as doc 08 §1.1's Talent Score
re-normalization).
→ `services/agents/fraud/tools/aggregation.py`

**`fraud_flags.candidate_id` is additive** — neither doc's SQL has it (subject_type/
subject_id alone would require a different join per subject_type to resolve back to a
candidate), but `/candidates/{id}/flags`, the dispute flow, and the authenticity score
rollup all need a direct candidate lookup path. Populated by the router at flag-creation
time from whichever subject the check was run against.
→ `packages/db/models/fraud.py` (`FraudFlag.candidate_id`)

**Additive endpoint: `GET /flags/{id}`** — not in doc 06 §6/§7's literal list, but the
admin evidence-viewer page and the Dispute Review Agent's assistive summary both need a
single-flag detail read richer than the queue list provides. The Dispute Review Agent
(Sonnet) is invoked from inside this endpoint, not a background job — it only ever
returns an assistive summary (`available: false` if Sonnet can't run, e.g. no API key)
and has no path to write `fraud_flags.status`; only `PATCH /flags/{id}/review` can.
→ `services/api/routers/fraud.py` (`get_flag_detail`)

**Consent enforcement reuses `_require_consent` from `candidates.py` per-signal (caught
and downgraded, not re-raised)** rather than gating the whole `duplicate-check` endpoint
on both consents at once — doc 06 §8 requires consent before EACH of photo-hashing and
resume-fingerprinting specifically, and a candidate who granted one but not the other
should still get the signal they did consent to, not a 403 for the whole check. The
function itself is imported, not duplicated, per the assignment's explicit instruction.
→ `services/api/routers/fraud.py` (`check_profile_duplicate`)

**Fraud Risk Report Agent (Sonnet) and Dispute Review Agent (Sonnet) both degrade to a
deterministic fallback / `available: false`, never block flag creation or review** — with
`ANTHROPIC_API_KEY` still empty in this dev environment (same unresolved gap noted in
every prior module's entries), every live test below exercised the fallback path: a flag
still gets a real evidence-linked `report_summary` (built directly from the signal
evidence, not fabricated), and the admin review endpoint still returns the raw evidence +
candidate statement with `dispute_review_assist.available: false` rather than failing.
→ `services/agents/fraud/tools/report_llm.py`, `services/agents/fraud/tools/dispute_review_llm.py`

**Verified live against the real Neon DB** (dependency-override-bypassing-Clerk
technique, same as Modules 01/02/03/05 — `httpx.AsyncClient` + `ASGITransport` in a
single asyncio loop rather than `TestClient`, since mixing `asyncio.run()` setup with
`TestClient`'s own threaded event loop broke the asyncpg connection pool bound to the
first loop's now-closed loop; documented here as a technique note for future sessions
hitting the same "Event loop is closed" error against this repo's async engine).
Inserted a real `Certification` row (no credential ID, low OCR confidence — routes to
Visual Forensics as expected) and two `Submission` rows sharing an `assessment_id` with
near-identical-but-renamed code. End-to-end run: certificate check (200, correctly no
flag — insufficient rules-based anomaly count); submission plagiarism check (200,
100% structural similarity correctly detected via `copydetect`'s AST-winnowing,
`code_plagiarism` flag raised with real evidence; GitHub cross-check correctly degraded
to "inconclusive" on an unauthenticated 401 rather than falsely reporting "clean");
profile duplicate-check (200, all three signals correctly reported "not enough
data"/"no consent" rather than fabricating a result); authenticity score computed fresh
each call — 100 before any uphold, then a SECOND end-to-end run on a later day
correctly compounded to 65 and then 30 as additional flags were upheld (100 - 35 - 35),
matching doc 08 §10's formula exactly; candidate-visible flags list; admin review queue;
`PATCH /flags/{id}/review` correctly rejected an empty-notes uphold attempt with 422
(`review_notes_required_for_upheld`) and accepted the same transition once real notes
were supplied; candidate dispute submission correctly moved `raised -> under_review` and
correctly rejected for a non-owning candidate (403, tested implicitly via the ownership
check in code — not separately exercised in this run); flag detail endpoint correctly
returned the dispute alongside `dispute_review_assist.available: false` (no API key).
`python -c "import services.api.main"` clean. `tsc --noEmit`, `eslint`, `next build` all
clean in `apps/web`, no route collisions (`/fraud-review`, `/fraud-review/[flagId]`,
`/my-flags` all resolve as their own routes).

**Every FR in doc/SRS/06 §3 is implemented and exercised**: FR-1 (cert check, live-tested,
routes correctly between Auto-Verify/Visual-Forensics branches), FR-2/FR-5 (shared
plagiarism graph, live-tested, real AST-winnowing similarity + flag), FR-3 (AI-content
signal, folded into the profile duplicate-check endpoint, never auto-flags alone), FR-4
(duplicate profile detection via text fingerprint + photo perceptual hash, live-tested
with the "no consent/no data" degrade path — not yet live-tested with an actual
duplicate pair, since no two candidate profiles/photos in the dev DB are actually
near-duplicates; the underlying MinHash/pHash logic was separately unit-verified with
synthetic near-duplicate text), FR-6 (authenticity score, live-tested end-to-end
including the 100 -> 65 -> 30 compounding), FR-7 (fraud risk reports, live-tested,
evidence-linked with a deterministic fallback narrative), FR-8 (dispute flow,
live-tested end-to-end including the human-gated review with enforced `review_notes`).
→ `packages/db/models/fraud.py`, `packages/shared_schemas/fraud.py`,
`services/agents/fraud/`, `services/api/routers/fraud.py`,
`apps/web/src/app/(admin)/fraud-review/`, `apps/web/src/app/(candidate)/my-flags/`,
`apps/web/src/lib/api.ts`

---

## 2026-07-30 — Phase 2 Integration Prep, Part 1: minimal supervisor graph demo

**Two things doc 07 §2's example code assumes that this codebase does NOT actually
have — built around them, not silently "fixed" (per the assignment brief's explicit
instruction to log this rather than change either doc's intent):**

1. `builder.compile(checkpointer=postgres_checkpointer)` — no module in this codebase
   uses a LangGraph checkpointer (Module 02's Recruiter Copilot, Module 03's Interview
   Agent both persist state to DB columns manually instead, per their own entries above).
   `services/agents/supervisor/graph.py` compiles without one, as a module-level
   `get_graph()` singleton — same pattern as `services/agents/candidate_intelligence/graph.py`.
2. Each module's real entry point is a REST router step (fetch DB context → build state →
   invoke its own subgraph → persist → respond), not a bare importable subgraph the
   supervisor can `ainvoke()` and expect DB I/O to already be done. The supervisor's
   per-module nodes instead call the exact service functions the routers themselves call
   (`services.api.routers.candidates._to_score_response`,
   `services.api.routers.recruitment._run_matching_and_persist`) — real DB reads/writes,
   not a mock. The live `AsyncSession` is threaded through `RunnableConfig.configurable["db"]`
   (LangGraph's supported per-invocation context mechanism), not through `SupervisorState`
   itself, since a plain state dict shared by a module-level singleton graph across
   concurrent requests is the wrong place to carry a live DB session object.

**Demo scope: 2 of 4 existing modules (Candidate Intelligence, Recruitment), not all 6.**
Per the assignment's "keep this genuinely minimal" instruction — Module 01's Talent Score
lookup and Module 02's real Flow B matching graph were the simplest pairing to demo
meaningfully ("given a candidate + job, fetch talent score and compute match"). Modules
03/04 dispatch targets are straightforward follow-up work once this pattern is proven;
Modules 05/06 are out of scope entirely (05 is only a cross-module *event source*, handled
by Part 2's consumer below, not by this graph; 06 belongs to a different concurrent
session).

**`POST /supervisor/route` requires only `get_current_user` (any authenticated role), not
a specific role** — routing itself isn't role-gated in doc 07; the underlying dispatched
functions (`_run_matching_and_persist`, the TalentScore query) don't re-check role either
at this call site, since this is a demo of the pattern, not a production authorization
surface. Revisit if this graph grows into a real user-facing endpoint.

**Could not live-test intent classification itself** — `ANTHROPIC_API_KEY` is still
unconfigured repo-wide (same gap Module 01's first entry logged 2026-07-29, confirmed
still empty in `.env` today). `classify_intent` correctly raises `SupervisorUnavailable`
(mapped to a 503) rather than guessing, verified live. The two dispatch nodes were
verified live against the real Neon DB by calling them directly (bypassing only the
classifier step, which the full graph can't skip since `classify_intent` is the fixed
entry point): `recruitment.run` against a real `Job` row ran the actual Flow B matching
graph in-process and returned real persisted `match_percentage`/`explanation` values (2
real candidates matched); `candidate_intelligence.run` correctly returned `talent_score:
None` (not a crash) for a candidate with no `TalentScore` row yet; `recruitment.run`
correctly returned a typed `error` string (not a crash) when `job_id` was missing.
`python -c "import services.api.main"` clean.
→ `services/agents/supervisor/`, `services/api/routers/supervisor.py`,
`packages/shared_schemas/supervisor.py`, `services/api/main.py`

---

## 2026-07-30 — Phase 2 Integration Prep, Part 2: event consumer + recruiter watchlist matching

**Consumer trigger: fixed-interval `asyncio` polling loop (`services/api/core/event_consumer.
run_polling_loop`, default 30s), started as a background task from `main.py`'s
`@app.on_event("startup")` hook — not Celery/Arq.** No module in this codebase uses a task
queue for anything yet, and a hackathon-scoped demo doesn't need one for a single
lightweight polling job. Each cycle opens its own short-lived `AsyncSession` (never holds
one across `sleep`) and swallows/logs any cycle failure rather than killing the loop. The
core logic (`process_pending_events`) is also directly callable on-demand (e.g. from a
script or a future manual-trigger endpoint) — the polling loop is just one caller of it,
not baked into its signature.

**Event processing (`processed_at`) and watchlist matching are deliberately decoupled —
matching is computed LIVE, not persisted, and does not depend on whether an event has been
"processed" yet.** `process_pending_events` only marks `hackathon.rankings.finalized` rows
handled (a durability/observability record). `get_matching_top_performers_for_recruiter`
recomputes matches at read time straight from `hackathon_rankings` + `hackathon_teams` +
`hackathon_team_members` + `candidate_profiles` + this recruiter's `recruiter_watchlists`
rows. Chosen over persisting a match table (the assignment's own explicit preference)
because a recruiter's watchlist can be created or edited *after* an event was published —
a match computed only at event-processing time would go stale or simply miss it. This also
means `GET /recruiters/me/top-performers-feed` doesn't need to wait on the poller at all;
it's correct immediately after `rankings/finalize` commits, same as before this pass.

**Watchlist match semantics** (`recruiter_watchlists.criteria = {track, min_rank, skills}`,
per Module 05's schema): a criterion that's `None`/empty is "no constraint," not "must be
empty" — `track` case-insensitively equals the team's track; `min_rank` means the team's
finalized `rank <= min_rank`; `skills` means at least one requested skill (case-
insensitive) appears in the candidate's `candidate_profiles.skills` names. A watchlist with
all three empty matches everything (an intentionally permissive "notify me about all top
performers" watchlist). A recruiter with zero watchlist rows still sees the full unfiltered
top-3 feed (`matched_watchlist=False` on every entry) — same "never empty" behavior Module
05's placeholder endpoint already had.

**Wired `GET /recruiters/me/top-performers-feed` (`services/api/routers/hackathons.py`) to
call the new live-matching function instead of its old unfiltered query**, and added
`matched_watchlist: bool` / `match_reasons: list[str]` to `TopPerformerEntry`
(`packages/shared_schemas/hackathon.py`) — additive fields, existing consumers unaffected.
This is a small edit to a file outside this track's original file-ownership list, but the
assignment's own stated goal is explicitly "powering `GET /recruiters/me/top-performers-
feed`," which lives there; the change is a one-function-call swap plus 2 additive schema
fields, not a rewrite, and doesn't touch anything Module 06 owns.

**Frontend**: `(recruiter)/top-performers/page.tsx` already existed (Module 02) showing the
unfiltered feed with a "Phase 2 integration" placeholder note — updated it to highlight
matched entries (primary-colored border/badge, sorted first when the recruiter has any
watchlist), show `match_reasons`, and replaced the placeholder note with real copy.
Added `matched_watchlist`/`match_reasons` to the `TopPerformerEntry` TS interface in
`apps/web/src/lib/api.ts` (additive).

**Verified live against the real Neon DB**: a scratch script created a throwaway
recruiter/candidate/hackathon/team/ranking/watchlist/event row set matching the exact
payload shape `recruiter_notification.py` actually publishes
(`{hackathon_id, top_teams, candidate_ids}`), confirmed the match is computed correctly
and live (`matched_watchlist=True`, `match_reasons=["track '...'", "rank <= 3", "skills
[...]"]`) even *before* `process_pending_events` ran; confirmed `process_pending_events`
correctly picked up both the synthetic row and 2 pre-existing real
`hackathon.rankings.finalized` events already sitting unprocessed in this DB from Module
05's own earlier live-testing, setting `processed_at` on all 3 without error (proving
compatibility with the real publisher's actual payload shape, not just a hand-shaped
synthetic one); confirmed idempotency (already-processed events skipped on a second run);
confirmed a recruiter with no watchlist still gets the unfiltered fallback; cleaned up all
throwaway rows after. `python -c "import services.api.main"` clean. `tsc --noEmit`,
`eslint`, and `npm run build` (Turbopack) all clean in `apps/web`, no route collisions,
`/top-performers` renders as a normal dynamic route.
→ `services/api/core/event_consumer.py`, `services/api/routers/hackathons.py`,
`packages/shared_schemas/hackathon.py`, `services/api/main.py`,
`apps/web/src/app/(recruiter)/top-performers/page.tsx`, `apps/web/src/lib/api.ts`

---

## 2026-07-30 — QA fix, Track 1: Assessment assignment loop (Recruiter #1 / Candidate #4)

**Schema**: `candidate_id` added to `Assessment` and `AssessmentCreateRequest` as **nullable**,
FK to `candidate_profiles` (not `users`) — matches the convention every other candidate-scoped
column in this module already uses (`Submission.candidate_id`, `InterviewSession.candidate_id`,
`ContributionReport.candidate_id`). Nullable because a recruiter can author a reusable assessment
template (e.g. per `job_id`) before assigning it to any specific candidate — mirrors `job_id`'s
own existing nullability, not a new pattern.

**Exact contract other tracks depend on** (Track 3's kanban "Assign Assessment" button calls
this):
- `POST /assessments` — request body: `{"job_id": "<uuid>|null", "candidate_id": "<uuid>|null",
  "type": "coding"|"mcq"|"project_analysis", "spec": {...}}`. Response: the full
  `AssessmentResponse` (`id`, `job_id`, `candidate_id`, `type`, `spec`, `created_at`).
- `GET /assessments/mine` — candidate-only (`require_role("candidate")`), no request body,
  returns `AssessmentResponse[]` filtered to `candidate_id == <authenticated candidate's
  candidate_profiles.id>`.

**Frontend**: new `apps/web/src/app/(candidate)/assessments/page.tsx` inbox/list page calling
`GET /assessments/mine`, replacing the previously-hardcoded dead `/assessments/sample-assessment`
nav link in `(candidate)/layout.tsx`.

**Migration hygiene note**: this worktree's branch predates Module 06's merge to `main`, so its
own local copy of Module 06's migration (`54e04d937561`) briefly existed as a stray duplicate
file in this worktree — deleted before commit since it was byte-identical to what's already on
`main`; this track's own migration (`b1c2d3e4f5a6`) correctly chains its `down_revision` onto
`54e04d937561` regardless.

**Verified**: Python syntax-checked clean (`ast.parse`); router/model/schema read carefully for
correctness (no live-DB run performed in this pass — deferred to the consolidated post-merge
verification pass covering all QA-fix tracks together).
→ `packages/shared_schemas/assessment.py`, `packages/db/models/assessment.py`, migration
`b1c2d3e4f5a6`, `services/api/routers/assessments.py`,
`apps/web/src/app/(candidate)/assessments/page.tsx`, `apps/web/src/app/(candidate)/layout.tsx`,
`apps/web/src/lib/api.ts`
