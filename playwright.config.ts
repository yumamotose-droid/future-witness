import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never", outputFolder: "artifacts/playwright-report" }]],
  outputDir: "artifacts/playwright-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ja-JP",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
  /**
   * End-to-end tests run against a production build, not the dev server. The
   * dev server injects an HMR socket and React's development overlay, so a
   * pass there would say nothing about what a reviewer will actually load.
   */
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    // The suite performs many deliberations from one address in a few
    // minutes. This override exists for that and must never be set in
    // production — see SECURITY.md.
    //
    // The empty key forces the scripted engine. These tests assert on exact
    // sentences, which only a scripted run produces: with a key present the
    // server answers from the model and every such assertion fails for a
    // reason that has nothing to do with the change under test. Live
    // behaviour is checked by scripts/validate-runs.mts instead.
    env: { RATE_LIMIT_CAPACITY: "500", GEMINI_API_KEY: "" },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
