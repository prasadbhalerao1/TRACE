import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Runs once, serially, before any real test project — see playwright.config.ts's
// "setup" project and its "chromium" project's dependencies: ["setup"].
// clerkSetup() fetches a Testing Token from Clerk's Frontend API using
// CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY (read from apps/web/.env.test — see
// e2e/README.md) and makes it available to every subsequent test via
// setupClerkTestingToken({ page }). Without real keys in .env.test this call
// fails fast and clearly, which is exactly the point: every test in this
// directory is built-but-unverified until a future session supplies real Clerk
// test credentials, per this track's assignment brief.
setup.describe.configure({ mode: "serial" });

setup("global setup: obtain Clerk testing token", async () => {
  await clerkSetup();
});
