import { defineConfig } from "@playwright/test";

// Pure logic tests require neither a web server nor a browser installation.
export default defineConfig({
  testDir: "./tests/unit",
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  outputDir: "test-results/unit",
});
