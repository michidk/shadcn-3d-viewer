import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const directory = await mkdtemp(path.join(tmpdir(), "viewer-consumer-"));
// Outside this repository so missing dependencies cannot resolve from its node_modules.
const consumer = path.join(directory, "app");
function npm(args, cwd, capture = false) {
  return execFileSync("npm", args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    timeout: 300_000,
  });
}
try {
  await cp(path.join(root, "tests/fixtures/consumer"), consumer, { recursive: true });
  const theme = await readFile(path.join(consumer, "src/style.css"), "utf8");
  const config = await readFile(path.join(consumer, "components.json"), "utf8");
  // The caller builds the registry; skip prepack here to avoid recursive checks.
  const packed = JSON.parse(
    npm(["pack", "--ignore-scripts", "--json", "--pack-destination", directory], root, true),
  );
  const [pack] = Array.isArray(packed) ? packed : Object.values(packed);
  npm(["install", "--no-audit", "--no-fund", path.join(directory, pack.filename)], consumer);
  execFileSync(
    process.execPath,
    [path.join(consumer, "node_modules/shadcn-3d-viewer/bin/shadcn-3d-viewer.mjs"), "add", "--yes"],
    {
      cwd: consumer,
      stdio: "inherit",
      timeout: 300_000,
    },
  );
  const registry = JSON.parse(
    await readFile(path.join(root, "public/r/model-viewer.json"), "utf8"),
  );
  for (const file of registry.files)
    assert.ok(await readFile(path.join(consumer, file.path)), `Installed ${file.path}`);
  assert.equal(
    await readFile(path.join(consumer, "src/style.css"), "utf8"),
    theme,
    "Host theme stays unchanged",
  );
  assert.equal(
    await readFile(path.join(consumer, "components.json"), "utf8"),
    config,
    "Host configuration stays unchanged",
  );
  npm(["run", "build"], consumer);
  console.log(
    "Packed CLI installed all viewer sources and dependencies; the independent consumer builds.",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
