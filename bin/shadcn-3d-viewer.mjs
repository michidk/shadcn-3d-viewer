#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const registryFile = fileURLToPath(new URL("../public/r/model-viewer.json", import.meta.url));
const packageFile = fileURLToPath(new URL("../package.json", import.meta.url));
const packageJson = JSON.parse(readFileSync(packageFile, "utf8"));
const [command, ...args] = process.argv.slice(2);

if (!command || command === "--help" || command === "-h") {
  process.stdout.write(
    "Install the source-owned model viewer into a Base UI shadcn project.\n\nUsage: npx shadcn-3d-viewer@latest add [shadcn add options]\n\nExamples:\n  npx shadcn-3d-viewer@latest add\n  npx shadcn-3d-viewer@latest add --dry-run\n",
  );
  process.exit(0);
}

if (command === "--version" || command === "-v") {
  process.stdout.write(`${packageJson.version}\n`);
  process.exit(0);
}

if (command !== "add") {
  process.stderr.write(`Unknown command: ${command}. Run shadcn-3d-viewer --help.\n`);
  process.exit(2);
}

if (!existsSync(registryFile)) {
  process.stderr.write("The model-viewer registry file is missing from this package.\n");
  process.exit(1);
}

// Run the exact shadcn release that generated and tested this registry, never a moving dist-tag.
const shadcnVersion = packageJson.devDependencies?.shadcn;
if (!/^\d+\.\d+\.\d+$/.test(shadcnVersion ?? "")) {
  process.stderr.write("This package does not declare an exact shadcn version to install with.\n");
  process.exit(1);
}
const shadcn = `shadcn@${shadcnVersion}`;
const npmCli = process.env.npm_execpath?.endsWith("npm-cli.js") ? process.env.npm_execpath : null;
const executable = npmCli ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";
const npmArgs = npmCli
  ? [npmCli, "exec", "--yes", "--", shadcn, "add", registryFile, ...args]
  : ["exec", "--yes", "--", shadcn, "add", registryFile, ...args];
const result = spawnSync(executable, npmArgs, { stdio: "inherit" });
if (result.error) {
  process.stderr.write(`Could not start npm: ${result.error.message}\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
