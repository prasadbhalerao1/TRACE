# Member 3 — Platform Hardening & Observability

**This file is self-contained.** You should not need to open any other person's assignment file.
Read `.agents/BUILD_ROADMAP.md`, `.agents/DOCUMENTATION_MAP.md`, and `.agents/decisions.md` for
shared context, but **you have no module dependency — start immediately**, in parallel with
Modules 05/06.

## Your scope — five independent pieces, do them in this order

### 1. Global FastAPI exception handler (fixes a real bug already found this session)

**The bug**: when an endpoint raises an unhandled, non-`HTTPException` exception, Starlette's
`ServerErrorMiddleware` generates the 500 response *outside* `CORSMiddleware`'s wrapping, so it
never gets CORS headers attached. The browser then reports it as a CORS failure, masking the real
500 — this is exactly what happened with `/candidates/me/dashboard` earlier this session (root
cause was actually a DB migration bug, but the symptom was 100% mistaken for a CORS
misconfiguration because of this gap). Full story in `.agents/decisions.md`'s "DB migration bug
found on Module 01" entry.

**The fix**: add a global exception handler in `services/api/main.py` (currently ~28 lines, just
mounts routers — read it first) using `@app.exception_handler(Exception)`. It must still return a
response with the correct CORS headers for the requesting origin (check `settings.
cors_allowed_origins`), log the real exception server-side (traceback, not swallowed), and return a
generic `{"detail": "internal_server_error"}` body with status 500 — never leak a stack trace to
the client. Verify the fix by writing a throwaway route that deliberately raises, confirming the
response carries an `Access-Control-Allow-Origin` header.

### 2. Wire Langfuse tracing

`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`/`LANGFUSE_HOST` already exist in `.env` (check
`services/api/core/config.py` — they're not yet read into `Settings` at all, add them). The
`agent_runs.langfuse_trace_id` column already exists on every module's `AgentRun` writes
(`packages/db/models/agent_run.py`) and is currently always `None` everywhere — every module wrote
the row but never populated the trace id. Add a small `services/api/core/tracing.py` helper that
wraps an Anthropic call (or a LangGraph `.ainvoke()`) with a Langfuse trace and returns the trace
id, then update every `AgentRun(...)` construction across `services/api/routers/*.py` to pass it
in. This touches every router file — coordinate by making this change last, after Modules 05/06
land, or expect merge conflicts on every router (a `git rebase` once they're in is cheaper than
fighting over `candidates.py`/`recruitment.py`/`assessments.py` simultaneously).

### 3. Wire Sentry

`SENTRY_DSN` already exists in `.env`, unused. Add `sentry_sdk.init(dsn=settings.sentry_dsn, ...)`
in `services/api/main.py`'s startup, gated on the DSN being non-empty (so local dev without a DSN
doesn't error). This pairs naturally with item 1 — the global exception handler should also report
to Sentry.

### 4. Wire the rate limiter

`RATE_LIMIT_PER_MINUTE` setting already exists in `services/api/core/config.py`, unused anywhere.
Add a simple in-memory or Redis-backed (Redis is already running via `infra/docker-compose.yml`,
check `services/api/core/config.py`'s `redis_url` — wait, check if that setting exists; if not, add
it) rate-limit middleware in `main.py`. Keep it simple: a sliding-window or fixed-window counter
per authenticated user id (or IP for unauthenticated routes), 429 on exceeding
`RATE_LIMIT_PER_MINUTE`. Don't over-engineer this — a basic `slowapi` integration (check if it's in
`services/api/.venv` already, install if not) is more than sufficient.

### 5. Real E2E browser test infrastructure — the highest-value item here

Every module built this session (01, 02, 03, 04) was verified two ways: (a) a dependency-override
script that bypasses Clerk auth and hits the real Neon DB directly — this is solid and proves the
backend works; (b) `tsc`/`eslint`/`next build` — proves the frontend compiles and has no route
collisions. **Neither of these proves the UI actually renders correctly, that the kanban
drag-and-drop works, that the Copilot chat displays results properly, or that the Monaco/Pyodide
code editor loads and runs code in a real browser.** This gap was flagged explicitly in
`.agents/decisions.md`'s Module 02 and Module 03 entries — every session hit it and had to fall
back to curl/type-check-only verification.

Set up:
- A Clerk test user (one per role: candidate, recruiter, at minimum) with real, storable
  credentials — check the `clerk-testing` skill/Clerk docs for the standard "test mode" pattern
  (Clerk supports fixed OTP codes for test phone numbers, or you can create a password-based test
  user via the Clerk Dashboard/API and store credentials in a `.env.test` file, gitignored).
- Either `chromium-cli` (a headless-Chromium REPL, if available in this environment) or Playwright
  (`npm install -D @playwright/test` in `apps/web`) as the driver.
- One working example test that: starts both dev servers, logs in as the test candidate, navigates
  to the dashboard, and screenshots it — proving the pattern end-to-end. Document the exact
  commands in a new `apps/web/e2e/README.md` (or a project skill via `/run-skill-generator` if
  that's available) so every future session can reuse it instead of re-deriving it.
- Once this works, go back and actually click through Module 01-04's key flows (post a job, run a
  Copilot search, drag a kanban card, run a coding assessment through Pyodide) and report any
  visual bugs you find — but only after the infra itself works; don't try to build the test
  harness and audit the UI in the same pass.

## File ownership — never touch outside this list

`services/api/main.py` (additive only — exception handler, Sentry init, rate-limit middleware),
`services/api/core/` (new files, or additive changes to `config.py` only — never remove an existing
setting), new `apps/web/e2e/` directory, `.agents/` doc upkeep.

**Do not touch any module's `routers/*.py`, `agents/`, or `models/*.py` files** except the
additive `AgentRun(...)` trace-id changes in item 2, and only after coordinating timing as
described there.

## Shared files you WILL edit — expect trivial merge conflicts, not blockers

- `.agents/decisions.md` — append your own dated section at the end.
- `services/api/main.py` — you own the exception-handler/Sentry/rate-limit additions here; expect
  the other three people to each add one `app.include_router(...)` line too. Trivial merge.

## Definition of done

All five items working and verified: a deliberate-throw test route confirms CORS headers survive a
500; a real Anthropic call shows up in the Langfuse dashboard with a populated trace id; a
deliberate exception shows up in Sentry; a rapid-fire request loop gets 429'd; and the E2E test
infra produces a real screenshot of a logged-in dashboard. Commit progressively, one item at a
time, not one giant commit.
