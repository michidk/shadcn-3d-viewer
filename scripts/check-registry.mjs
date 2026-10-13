import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const registry = JSON.parse(readFileSync("registry.json", "utf8"));
const files = [
  "public/r/registry.json",
  ...registry.items.map((item) => `public/r/${item.name}.json`),
];
const before = files.map((file) => readFileSync(file, "utf8"));
execFileSync("bun", ["run", "registry:build"], { stdio: "inherit" });
const stale = files.filter((file, index) => readFileSync(file, "utf8") !== before[index]);
if (stale.length) {
  console.error(
    `Registry was stale and has been regenerated: ${stale.join(", ")}. Review and commit it.`,
  );
  process.exitCode = 1;
}
