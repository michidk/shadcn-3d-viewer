import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("registry installs only viewer sources and leaves host styling untouched", async () => {
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  const item = registry.items[0];
  const built = JSON.parse(await readFile("public/r/model-viewer.json", "utf8"));
  expect(built.files.map((file: { path: string }) => file.path)).toEqual(
    item.files.map((file: { path: string }) => file.path),
  );
  expect(item.registryDependencies).toEqual(["alert", "button", "tooltip", "dropdown-menu"]);
  expect(item.cssVars).toBeUndefined();
  expect(item.css).toBeUndefined();
  expect(item.files.length).toBeGreaterThan(9);
  expect(item.files.map((file: { path: string }) => file.path)).toContain(
    "src/components/ui/model-viewer/model-viewer-lifecycle.ts",
  );
  expect(item.files.map((file: { path: string }) => file.path)).toContain(
    "src/components/ui/model-viewer/outside-sky.tsx",
  );
  for (const file of item.files) {
    expect(file.path).toMatch(/^src\/components\/ui\/model-viewer\//);
    const source = await readFile(file.path, "utf8");
    expect(source).not.toMatch(/(?:import|@import).*theme\.css/);
    expect(source).not.toMatch(/:root\s*\{|--primary\s*:/);
  }
});
