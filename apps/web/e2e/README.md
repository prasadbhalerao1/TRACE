# End-to-end tests

Playwright specs that drive a real browser against the running app.

## Prerequisites

1. **The full stack must be running** — API, worker, frontend, and the Docker
   containers. Playwright does not start them (no `webServer` hook; see
   `playwright.config.ts` for why).

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\dev-up.ps1
   ```

2. **The database must be seeded.** The specs sign in as the demo candidate created by
   `scripts/seed_db.py`:

   | Setting | Default |
   | :--- | :--- |
   | `E2E_CANDIDATE_EMAIL` | `demo_candidate@trace.dev` |
   | `E2E_CANDIDATE_PASSWORD` | `password123` |
   | `E2E_BASE_URL` | `http://localhost:3000` |

   Override any of them in `apps/web/.env.test` (gitignored). No credentials need to be
   created by hand — auth is self-hosted, so the seeded user is a real account.

## Running

```powershell
cd apps\web
npm run e2e             # headless
npx playwright test --ui       # interactive
npx playwright test --headed   # watch the browser
npm run e2e:report      # open the last HTML report
```

## Run against a production build

**Strongly recommended.** The webpack dev server compiles each route on first request,
which can take 3–15 seconds and will blow past the specs' navigation timeouts. Against a
production build the whole suite finishes in about 6 seconds.

```powershell
cd apps\web
npm run build
npx next start -p 3100
```

The API enforces CORS by origin, so a non-default port must be allowed. In the repo-root
`.env`:

```ini
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3100
```

Restart the API after changing it, then:

```powershell
$env:E2E_BASE_URL="http://localhost:3100"; npx playwright test
```

Simpler alternative: run `npm run build` and `npx next start -p 3000` on the default
port, and leave CORS untouched.

## What's covered

`candidate-login-dashboard.spec.ts`

| Test | Asserts |
| :--- | :--- |
| Signs in and lands on the role hub | Auth round-trip works; `/home` renders the correct role's feature catalog |
| Shows the workspace sidebar | Sidebar is present and **survives navigation** — it used to blank on every route change |
| Rejects bad credentials | A wrong password surfaces an error and does not navigate |

## Notes

- Each test starts from a blank `storageState`, so the bearer token and the cached `/me`
  in `localStorage` never leak between tests.
- Navigation assertions use `waitUntil: "commit"`. Sign-in navigates via
  `router.replace`, a client-side transition that never fires the `load` event that
  `waitForURL` waits for by default.
- These tests previously targeted a hosted Clerk `<SignIn/>` widget and imported
  `@clerk/testing`, which is not a dependency of this project and which the app has
  never used. They could not import, let alone run. They now drive the app's own
  email/password form.
