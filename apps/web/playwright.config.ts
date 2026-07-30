import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import path from "node:path";

// Loaded here (not by Next.js) because Playwright's own process — not the dev
// server — is what needs CLERK_PUBLISHABLE_KEY/CLERK_SECRET_KEY/test-user creds
// for @clerk/testing's clerkSetup()/setupClerkTestingToken(). Gitignored, real
// values are never committed — see apps/web/e2e/README.md for how to populate it.
dotenv.config({ path: path.resolve(__dirname, ".env.test") });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
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
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
  ],
  // This repo's own dev startup script (DEV_SERVERS.md) starts both the Next.js
  // dev server and the FastAPI backend together. Playwright's webServer hook is
  // deliberately NOT configured here: a future session with real credentials
  // should start both servers itself (see e2e/README.md's exact commands) and
  // point E2E_BASE_URL at whichever origin they're actually running on, rather
  // than this config silently spawning a second, config-drifted dev server.
});
