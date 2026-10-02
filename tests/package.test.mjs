import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const registry = JSON.parse(readFileSync(new URL("../public/r/model-viewer.json", import.meta.url), "utf8"));
const cli = fileURLToPath(new URL("../bin/shadcn-3d-viewer.mjs", import.meta.url));

test("npm package installs a complete source-owned registry item", () => {
  assert.equal(packageJson.name, "shadcn-3d-viewer");
  assert.equal(packageJson.private, undefined);
  assert.equal(packageJson.license, "MIT");
  assert.equal(packageJson.bin["shadcn-3d-viewer"], "bin/shadcn-3d-viewer.mjs");
  assert.equal(registry.name, "model-viewer");
  assert.ok(registry.files.length > 15);
  assert.ok(registry.files.some((file) => file.path.endsWith("model-viewer-scene.tsx")));
  assert.ok(registry.files.some((file) => file.path.endsWith("model-viewer-camera.ts")));
  assert.ok(registry.registryDependencies.includes("button"));
});

test("CLI reports its version and rejects unknown commands", () => {
  assert.equal(execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" }).trim(), packageJson.version);
  assert.match(execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" }), /npx shadcn-3d-viewer add/);
  const invalid = spawnSync(process.execPath, [cli, "publish"], { encoding: "utf8" });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /Unknown command/);
});
