import { setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

/**
 * Proves the one pattern every future E2E test in this repo should reuse: a real
 * browser (a) logs in through Clerk's actual hosted `<SignIn/>` UI (not a mocked
 * auth bypass — every module this session was verified with a dependency-override
 * script that bypasses Clerk entirely, which proves the backend works but has
 * never proven the UI itself renders, per this track's assignment brief), (b)
 * lands on the real role-routed `/dashboard` (apps/web/src/app/dashboard/page.tsx),
 * and (c) takes a screenshot as visual proof.
 *
 * STATUS: built-but-unverified, by design (Platform Hardening track, 2026-07-30).
 * This repo has no real Clerk test-user credentials yet — `ANTHROPIC_API_KEY`,
 * `LANGFUSE_*`, and `SENTRY_DSN` are all still empty too (see .agents/decisions.md's
 * dated entry), and the same is true here for Clerk. Rather than invent fake
 * credentials to make this "pass," it fails closed: `test.skip()` fires whenever
 * `E2E_CANDIDATE_EMAIL`/`E2E_CANDIDATE_PASSWORD` aren't set, so `npx playwright test`
 * reports this as skipped, not green, until a future session fills in
 * apps/web/.env.test. See e2e/README.md for the exact Clerk Dashboard steps to
 * create that test user and the exact commands to run this for real.
 */
test.describe("candidate login -> dashboard", () => {
  test("logs in as the test candidate and reaches the dashboard", async ({ page }) => {
    const email = process.env.E2E_CANDIDATE_EMAIL;
    const password = process.env.E2E_CANDIDATE_PASSWORD;

    test.skip(
      !email || !password,
      "E2E_CANDIDATE_EMAIL/E2E_CANDIDATE_PASSWORD not set in apps/web/.env.test — " +
        "see apps/web/e2e/README.md for how to create a real Clerk test user and " +
        "populate them. This is the one honest, documented limitation this track " +
        "could not resolve without live credentials.",
    );

    // setupClerkTestingToken() must run before any navigation to an auth page —
    // it injects a Testing Token (obtained once in global.setup.ts) that bypasses
    // Clerk's bot-detection heuristics, which would otherwise block a headless
    // Playwright browser from completing sign-in.
    await setupClerkTestingToken({ page });

    await page.goto("/sign-in");

    // Clerk's hosted <SignIn/> component (apps/web/src/app/(public)/sign-in/[[...sign-in]]/page.tsx)
    // renders its own form; these selectors match Clerk's documented default
    // field names for the password-based sign-in strategy.
    await page.getByLabel(/email address/i).fill(email!);
    await page.getByRole("button", { name: /continue/i }).click();
    await page.getByLabel(/password/i).fill(password!);
    await page.getByRole("button", { name: /continue/i }).click();

    // dashboard/page.tsx redirects unauthenticated users to /sign-in and onboarding-
    // incomplete users to /onboarding, so landing on /dashboard for a real (already
    // onboarded) test candidate is itself proof the full auth round-trip worked.
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByText(/dashboard/i).first()).toBeVisible();

    await page.screenshot({ path: "e2e/test-results/candidate-dashboard.png", fullPage: true });
  });
});
