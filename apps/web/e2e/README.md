# E2E Test Infrastructure — Playwright + Clerk

## What's here

```
apps/web/e2e/
  global.setup.ts                         # Fetches Clerk Testing Token once (serial, runs first)
  candidate-login-dashboard.spec.ts       # Proves the full login → dashboard round-trip
playwright.config.ts                      # Loaded at apps/web/ root
apps/web/.env.test                        # GITIGNORED — your local Clerk test-user credentials
```

## Status — built-but-unverified by design

This E2E infrastructure is **structurally complete** but requires real Clerk test credentials
to actually run. No `ANTHROPIC_API_KEY`, `LANGFUSE_*`, `SENTRY_DSN`, or Clerk test credentials
exist in this repo yet (all confirmed empty; see `.agents/decisions.md`'s Platform Hardening
entry for the full rationale). Every test fails-closed with `test.skip()` when credentials
aren't present — `npx playwright test` will report "skipped", not "passed" or "failed",
until a future session follows the steps below.

## Step 1 — Create a Clerk test user (one-time, per role needed)

1. Open [Clerk Dashboard](https://dashboard.clerk.com) → your application → **Users**.
2. Click **Create user**.  Choose **Password** as the auth strategy (not OTP — a stored password
   is easier for automated testing).
3. Set a stable email, e.g. `e2e-candidate@example.com`, and a strong password.
4. After creation, find the user's **User ID** in the Dashboard.
5. In your Overwatch app, hit `POST /users/onboarding` with `{ "role": "candidate" }` authenticated
   as that new Clerk user to complete the platform onboarding step — without this the dashboard
   route will redirect to `/onboarding` and the test will fail.

   ```bash
   # Using the dependency-override script already in this repo (see scripts/):
   # Or manually with curl once you have a short-lived session token from Clerk's UI.
   ```

## Step 2 — Populate `apps/web/.env.test`

Create `apps/web/.env.test` (gitignored — never commit this file):

```env
# Clerk keys — same values as .env's NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY / CLERK_SECRET_KEY
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Test-user credentials for the candidate role created in Step 1
E2E_CANDIDATE_EMAIL=e2e-candidate@example.com
E2E_CANDIDATE_PASSWORD=your-strong-password-here

# Where the Next.js dev server is running (default is fine for local dev)
E2E_BASE_URL=http://localhost:3000
```

## Step 3 — Start dev servers

Both the Next.js frontend **and** the FastAPI backend must be running. See `DEV_SERVERS.md`
at the repo root for the exact startup commands.

## Step 4 — Install Playwright browsers (one-time)

```powershell
Set-Location apps\web
npx playwright install chromium
```

## Step 5 — Run the tests

```powershell
# From apps/web/:
npm run e2e

# Or run a single spec:
npm run e2e -- e2e/candidate-login-dashboard.spec.ts

# To see the HTML report after a run:
npm run e2e:report
```

## What the test proves

`candidate-login-dashboard.spec.ts` verifies the full **Clerk-authenticated browser round-trip**
that the backend's dependency-override scripts cannot test:

1. Real headless Chromium navigates to `/sign-in`.
2. Clerk's hosted `<SignIn/>` component accepts the test-user's email + password.
3. The Next.js app routes the now-authenticated candidate to `/dashboard`.
4. A screenshot is captured to `e2e/test-results/candidate-dashboard.png`.

Once this works end-to-end, extend it to walk key flows per module:
post a job (recruiter role), drag a Kanban card, submit a Pyodide code assessment — each
is a one-additional-test addition to this same pattern.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| `test.skip()` fires immediately | `E2E_CANDIDATE_EMAIL` or `E2E_CANDIDATE_PASSWORD` missing from `.env.test` |
| `clerkSetup()` throws in `global.setup.ts` | `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` missing or wrong in `.env.test` |
| Login succeeds but redirects to `/onboarding` | Test user exists in Clerk but `POST /users/onboarding` was never called for it |
| Playwright can't connect to `http://localhost:3000` | Next.js dev server isn't running — see `DEV_SERVERS.md` |
| `setupClerkTestingToken` throws | The Clerk Testing Token from `global.setup.ts` expired — re-run the full suite, not a single test |
