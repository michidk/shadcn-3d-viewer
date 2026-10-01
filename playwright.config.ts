import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.VIEWER_TEST_URL ?? "http://localhost:5173",
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
    screenshot: "only-on-failure",
  },
});
