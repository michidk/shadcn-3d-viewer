import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/storybook.spec.ts",
  timeout: 60000,
  expect: { timeout: 15_000 },
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  webServer: process.env.CI && !process.env.STORYBOOK_TEST_URL ? {
    command: "bun run storybook --ci",
    url: "http://127.0.0.1:6006",
    timeout: 120_000,
    reuseExistingServer: false,
  } : undefined,
  use: {
    baseURL: process.env.STORYBOOK_TEST_URL ?? "http://localhost:6006",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
