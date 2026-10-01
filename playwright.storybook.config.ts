import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/storybook.spec.ts",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.STORYBOOK_TEST_URL ?? "http://localhost:6006",
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
  },
});
