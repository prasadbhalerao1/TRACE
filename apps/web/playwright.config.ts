import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "node:path";

// Optional overrides only (E2E_BASE_URL, E2E_CANDIDATE_EMAIL/PASSWORD). The specs
// default to the seeded demo candidate, so this file is not required to exist.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/report" }]],
  outputDir: "e2e/test-results",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Each test gets a fresh context, so the auth token and the cached /me that
        // CurrentUserProvider writes to localStorage never leak between tests. Without
        // this, a test that ends signed-in (or mid-redirect) changes the starting state
        // of the next one, and failures move around depending on execution order.
        storageState: { cookies: [], origins: [] },
      },
    },
  ],
  // No `webServer` hook on purpose: the API, worker and frontend are started together
  // by scripts/dev-up.ps1, and letting Playwright spawn its own Next dev server would
  // give a second, config-drifted instance on a different port. Start the stack first,
  // then run `npm run e2e`.
});
