# TRACE — UX Overhaul Progress Log

Working log for the smooth-UX pass. Started from a full performance audit; the plan lives
at `~/.claude/plans/your-job-is-to-structured-quokka.md`.

**Status as of 2026-08-16:** Phases 1, 1.5 and 3 complete. Phases 2, 4, 5, 6, 7 pending.

**Nothing is committed.** 83 files are modified/added in the working tree.

---

## Verification status

Everything below was re-run after the last change:

| Check | Command | Result |
| :--- | :--- | :--- |
| Python tests | `uv run pytest -q` | **82 passed** |
| API imports | `python -c "from services.api.main import app"` | **15 routes OK** |
| Typecheck | `npx tsc --noEmit` | **clean** |
| Lint | `npx eslint src` | **clean** |
| Migrations | `alembic upgrade head` / `downgrade -1` / `upgrade head` | **round-trips clean** |

E2E (`npm run e2e`, 3 specs) passed earlier in this work against a production build. It
has **not** been re-run since the consent removal and the `/onboarding` gate changed —
do that first on resume, because the sign-in path now depends on `onboarding_required`.

---

## What was fixed

### 1. The "Failed to fetch" errors while the API was running — root cause found

**This was a real bug, not a copy problem.** The rate limiter was set to
**60 requests/minute per user**. One dashboard load issues ~6 requests, and the limit is
per *user* across all endpoints, so a handful of navigations inside one minute returned
`429`s. The frontend had **no 429 handling at all**, so they surfaced as raw errors.

Reproduced directly: 75 rapid `GET /me` → `59 × 200, 16 × 429`.

Three fixes:

- `rate_limit_per_minute` default **60 → 600** (`services/api/core/config.py`), and the
  same in `.env` / `.env.example`. This is an abuse ceiling, not a usage budget.
- **CORS preflights exempted** (`services/api/core/rate_limit.py`). `OPTIONS` carries no
  `Authorization` header, so it fell through to the shared client-IP bucket — a page's
  real requests competed with their own preflights, and everyone behind one NAT shared
  the allowance.
- **Transient failures now auto-retry** with exponential backoff in `useAsyncResource`
  and `CurrentUserProvider` (429/502/503/504 and connection-level failures). Retries
  happen in place, so the section never flashes back to a loading state.

Verified after: 120 rapid `GET /me` → **120 × 200**; 30 preflights → **30 × 200**.

### 2. Boot-state error handling

A bare `TypeError: Failed to fetch` is indistinguishable from an app error to a user, but
usually just means the API hasn't finished pre-warming its 1.3GB embedding model.

New `ConnectionState` component (`apps/web/src/components/common/ConnectionState.tsx`)
distinguishes them: a connection failure has no HTTP status attached, a real error does.
It shows "Connecting to the server…" with automatic retry, escalating to "Still can't
reach the server" after 4 attempts. Wired into `WorkspaceShell`; genuine API errors still
get the red `SectionError` box.

### 3. Onboarding wizard — and the bug that made it unreachable

**`/onboarding` did not exist**, yet every workspace layout redirected there. Worse,
`GET /me` hardcoded `onboarding_required = False` whenever a `users` row existed — a
state signup makes unreachable — so the flag was effectively **always false** and the
redirect could never fire anyway.

- `_candidate_onboarding_incomplete` (`services/api/modules/users/router.py`) now checks
  `full_name`, `headline`, `location`, and a first `education` entry with both
  `institution` and `degree`. Read-only by design: `/me` runs on nearly every page load
  and must not create a profile row as a side effect. Only candidates are gated.
- Three-step wizard at `/onboarding` (identity → background → connect) with a progress
  rail, per-field validation, and a save through `PATCH /candidates/me` after each step
  so a refresh or OAuth detour never loses typed answers.
- GitHub is **required-but-skippable** — a hard block would strand users whenever OAuth
  is misconfigured, and the gap keeps surfacing on the `/home` completeness meter.
- `/onboarding` sits **outside every route group**, since those layouts are what redirect
  to it.

**Also found:** `completeOnboarding()` in `lib/api.ts` posted to `POST /users/onboarding`,
**an endpoint that has never existed** — only its Pydantic schema does. Every call would
have 404'd. It had no callers; removed.

**Seed gap fixed:** no seeded candidate had `education`, and the demo candidate had no
`location`, so every demo account would have been forced through the wizard on sign-in.
Fixed in `scripts/seed_db.py` and backfilled on the 8 live rows. Verified
`demo_candidate` / `alice` / `bob` all return `onboarding_required = False`.

### 4. Consent system removed entirely

Table, model, FK, all 8 backend enforcement points, all 6 frontend call sites, and
**every trace in comments, docstrings and documentation**.

- Migration `u6v7w8x9y0z1` drops `consents` and `interview_sessions.consent_id`. That
  column was **NOT NULL**, so it had to go first — the plan hadn't caught this. The
  downgrade mirrors the real table exactly (including `revoked_at`, `ip_address`,
  `terms_version` and both server defaults, which the ORM model never mapped).
  Round-trip tested.
- `_require_consent`, `POST /candidates/me/consents/{type}`, `grantConsent()` all gone.
- The interview page's consent card is gone; `/interview/new` now starts the session on
  arrival. `consentGiven` state renamed to `sessionStarted` — it never tracked consent,
  only whether the chat should render.
- In `check_profile_duplicate`, both comparison corpora were consent-gated; both now
  always run.
- Docs updated: `Hackathon_Submission.md` (§4.1.3 removed and sections renumbered, ER
  diagram, DDL, table/revision counts, security narrative, pitfall section), plus
  `00`, `09`, `13`, and three guides.
- **Dead config removed:** `INTERVIEW_CONSENT_REQUIRED` was in `.env`/`.env.example` but
  read by no code.

`grep -rni consent` across code and docs now returns **nothing**.

### 5. GitHub OAuth return path

The callback hard-coded a redirect to `/profile/edit`, so the wizard couldn't get the
user back. Added a `return_to` parameter carried through the OAuth `state`.

It is an **allowlist keyed by name, not a URL** — `state` survives a full round trip
through github.com, so echoing back an arbitrary value would be an open-redirect
primitive. Verified: `bogus_evil`, `//evil.com`, `""` and `None` all fall back to
`/profile/edit`.

The key rides inside the existing `_oauth_state_cache` tuple rather than a parallel dict,
so it's discarded by the same `.pop()` — a second map would leak an entry for every
abandoned OAuth flow.

### 6. Earlier in this pass (Phases 1 / 1.5.2 / 1.5.3)

- **28 fetchers were being invalidated on every render.** `AuthProvider` and
  `CurrentUserProvider` both returned fresh object literals with unmemoized functions;
  every fetcher in the app is memoized on `getToken`. `useCallback` + `useMemo` on both.
- `/me` cached in `localStorage`, hydration-safe via an `isLoaded` gate.
- `WorkspaceShell` renders the sidebar immediately; only `children` waits on `/me`.
- 14 `loading.tsx` skeletons.
- `/home` role-based hub; `/dashboard` moved inside `(candidate)` so it has a sidebar.
- Rebrand to TRACE; e2e suite rewritten off Clerk; uv/`pyproject.toml` + `SETUP.md`.

---

## Next up, in order

1. **Re-run e2e** — not run since the `/onboarding` gate changed. Sign-in now depends on
   `onboarding_required`, so this is the first thing to check.
2. **Phase 2 — dashboard progressive loading.** Split `/me/dashboard` into
   `dashboard:core` + `dashboard:github`; bound `_compute_github_summary` (~50 repos) and
   score history (last 30); surface the post-OAuth ingestion banner; fix the O(N²)
   population queries (`DISTINCT ON` + `COUNT < 30` guard + 5-min TTL).
3. **Phase 4 — interview lobby.** Two-pane topics + camera/mic preview replacing the
   generated-topics view at `interviews/page.tsx`. Plus two real leaks on the interview
   page: `recognitionRef.current?.stop()` (**the mic stays live after navigating away**)
   and `speechSynthesis.cancel()` on unmount.
4. **Phase 5 — bundle polish.** `next.config.ts` is still the empty scaffold:
   `optimizePackageImports`, dynamic recharts/Monaco, `useCountdown` clear at zero,
   `Promise.all` on the jobs page, visibilitychange polling pause.
5. **Phase 6 — backend hygiene.** `events` partial index, pagination, `GROUP BY`
   analytics, LLM-on-GET in `fraud/router.py`.
6. **Phase 7 — squash migrations.** Genuinely last, so Phase 6's schema changes fold in.

---

## Notes for whoever resumes

- **No LLM API key is configured.** Anything needing a live model (interview question
  generation, Copilot explanations, fact-check) can't be exercised end-to-end. These
  degrade to deterministic fallbacks by design, so they fail soft, not loud.
- The API does **not** run with `--reload`; restart it manually after backend edits.
  Several confusing results during this work traced back to a stale process.
- `lucide-react` no longer ships brand icons — there is no `Github` icon. `GitBranch` is
  used in the wizard.
- The seed scripts are not idempotent; re-running raises `UniqueViolationError`.
