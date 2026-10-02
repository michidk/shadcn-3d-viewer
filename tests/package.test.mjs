import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
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

test("CLI delegates to the exact shadcn version that built the registry", () => {
  assert.match(packageJson.devDependencies.shadcn, /^\d+\.\d+\.\d+$/);
  const directory = mkdtempSync(path.join(tmpdir(), "viewer-cli-"));
  try {
    // A stand-in npm CLI records the arguments instead of downloading shadcn.
    const npmCli = path.join(directory, "npm-cli.js");
    writeFileSync(npmCli, "console.log(JSON.stringify(process.argv.slice(2)));\n");
    const output = execFileSync(process.execPath, [cli, "add", "--dry-run"], {
      encoding: "utf8",
      env: { ...process.env, npm_execpath: npmCli },
    });
    const [, , , shadcn, add, , ...forwarded] = JSON.parse(output);
    assert.equal(shadcn, `shadcn@${packageJson.devDependencies.shadcn}`);
    assert.equal(add, "add");
    assert.deepEqual(forwarded, ["--dry-run"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
