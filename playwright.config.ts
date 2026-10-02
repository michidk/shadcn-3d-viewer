import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/viewer.spec.ts", "**/hierarchy.spec.ts"],
  timeout: 60000,
  expect: { timeout: 15_000 },
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  webServer: process.env.CI && !process.env.VIEWER_TEST_URL ? {
    command: "bun run dev --port 5173 --strictPort",
    url: "http://127.0.0.1:5173",
    timeout: 120_000,
    reuseExistingServer: false,
  } : undefined,
  use: {
    baseURL: process.env.VIEWER_TEST_URL ?? "http://localhost:5173",
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
