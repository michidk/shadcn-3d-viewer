import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test("every registry item is self-contained and leaves host styling untouched", async () => {
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  for (const item of registry.items) {
    const built = JSON.parse(await readFile(`public/r/${item.name}.json`, "utf8"));
    const paths = item.files.map((file: { path: string }) => file.path);
    expect(built.files.map((file: { path: string }) => file.path)).toEqual(paths);
    expect(item.cssVars).toBeUndefined();
    expect(item.css).toBeUndefined();
    for (const file of built.files) {
      expect(file.path).toMatch(/^src\/components\/ui\/model-viewer\//);
      const source = await readFile(file.path, "utf8");
      expect(file.content).toBe(source);
      expect(source).not.toMatch(/(?:import|@import).*theme\.css/);
      expect(source).not.toMatch(/:root\s*\{|--primary\s*:/);
      for (const match of source.matchAll(/["'](\.\/[^"']+)["']/g)) {
        const dependency = path.join(path.dirname(file.path), match[1]);
        expect(
          paths.some((candidate: string) =>
            [dependency, `${dependency}.ts`, `${dependency}.tsx`].includes(candidate),
          ),
          `${item.name}: ${file.path} requires ${dependency}`,
        ).toBe(true);
      }
    }
    if (item.name === "model-viewer-core") {
      expect(paths).not.toContain("src/components/ui/model-viewer/model-viewer-toolbar.tsx");
      expect(paths).not.toContain("src/components/ui/model-viewer/model-inspector.tsx");
      expect(paths).not.toContain("src/components/ui/model-viewer/index.ts");
    }
    if (item.name === "model-viewer-controls")
      expect(paths).not.toContain("src/components/ui/model-viewer/model-inspector.tsx");
    if (item.name === "model-viewer-inspector")
      expect(paths).not.toContain("src/components/ui/model-viewer/model-viewer-toolbar.tsx");
  }
});
