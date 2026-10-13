import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
// Outside the repository so missing dependencies cannot resolve from its node_modules.
const variants = ["vite-custom", "vite-modular", "next"];
const selectedVariant = process.argv[2];
if (selectedVariant)
  assert.ok(variants.includes(selectedVariant), `Unknown consumer: ${selectedVariant}`);
const directory = await mkdtemp(path.join(tmpdir(), "viewer-consumers-"));
function npm(args, cwd, capture = false) {
  return execFileSync("npm", args, {
    cwd,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
    timeout: 600_000,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
  });
}
async function add(consumer, item) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(consumer, "node_modules/shadcn-3d-viewer/bin/shadcn-3d-viewer.mjs"),
        "add",
        item,
        "--yes",
      ],
      {
        cwd: consumer,
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 600_000,
      },
    );
    let output = "";
    const consume = (chunk) => {
      process.stdout.write(chunk);
      output += chunk.toString();
      if (/Would you like to overwrite\?[^\n]*›/.test(output)) {
        child.stdin.end("n\n");
        output = "";
      }
    };
    child.stdout.on("data", consume);
    child.stderr.on("data", consume);
    child.on("error", reject);
    child.on("close", (code, signal) =>
      code === 0 ? resolve() : reject(new Error(`Installer exited with ${code ?? signal}`)),
    );
  });
  const registry = JSON.parse(await readFile(path.join(root, `public/r/${item}.json`), "utf8"));
  for (const file of registry.files)
    assert.ok(await readFile(path.join(consumer, file.path)), `Installed ${file.path}`);
}
async function compose(consumer, part) {
  const extra =
    part === "controls"
      ? 'import { ModelViewerDefaultToolbar } from "@/components/ui/model-viewer/controls";'
      : part === "inspector"
        ? 'import { ModelViewerInspector } from "@/components/ui/model-viewer/inspector";'
        : "";
  const child =
    part === "controls"
      ? "<ModelViewerDefaultToolbar />"
      : part === "inspector"
        ? "<ModelViewerInspector />"
        : "";
  await writeFile(
    path.join(consumer, "src/main.tsx"),
    `import { createRoot } from "react-dom/client";
import { ModelViewerRoot, ModelViewerScene } from "@/components/ui/model-viewer/core";
import "./style.css";
${extra}
createRoot(document.getElementById("root")!).render(<ModelViewerRoot><ModelViewerScene />${child}</ModelViewerRoot>);
`,
  );
}
try {
  const packed = JSON.parse(
    npm(["pack", "--ignore-scripts", "--json", "--pack-destination", directory], root, true),
  );
  const [pack] = Array.isArray(packed) ? packed : Object.values(packed);
  for (const variant of selectedVariant ? [selectedVariant] : variants) {
    const consumer = path.join(directory, variant);
    await cp(
      path.join(root, "tests/fixtures", variant === "next" ? "next-consumer" : "consumer"),
      consumer,
      { recursive: true },
    );
    const config = JSON.parse(
      await readFile(path.join(root, "tests/fixtures/consumer/components.json"), "utf8"),
    );
    config.style = variant === "vite-custom" ? "base-nova" : "base-lyra";
    config.rsc = variant === "next";
    await writeFile(path.join(consumer, "components.json"), `${JSON.stringify(config, null, 2)}\n`);
    if (variant === "next") {
      await mkdir(path.join(consumer, "src/lib"), { recursive: true });
      await cp(
        path.join(root, "tests/fixtures/consumer/src/lib/utils.ts"),
        path.join(consumer, "src/lib/utils.ts"),
      );
      await cp(
        path.join(root, "tests/fixtures/consumer/src/style.css"),
        path.join(consumer, "src/style.css"),
      );
    }
    npm(["install", "--no-audit", "--no-fund", path.join(directory, pack.filename)], consumer);
    let customButton;
    if (variant === "vite-custom") {
      npm(
        [
          "exec",
          "--yes",
          "--",
          `shadcn@${packageJson.devDependencies.shadcn}`,
          "add",
          "button",
          "--yes",
        ],
        consumer,
      );
      const buttonPath = path.join(consumer, "src/components/ui/button.tsx");
      customButton = (await readFile(buttonPath, "utf8")).replace(
        'data-slot="button"',
        'data-slot="button" data-consumer-custom="preserved"',
      );
      assert.match(customButton, /data-consumer-custom/);
      await writeFile(buttonPath, customButton);
    }
    const theme = await readFile(path.join(consumer, "src/style.css"), "utf8");
    const settings = await readFile(path.join(consumer, "components.json"), "utf8");
    if (variant === "vite-modular") {
      for (const part of ["core", "controls", "inspector"]) {
        await add(consumer, `model-viewer-${part}`);
        if (part === "core") {
          await assert.rejects(
            readFile(
              path.join(consumer, "src/components/ui/model-viewer/model-viewer-toolbar.tsx"),
            ),
            { code: "ENOENT" },
          );
          await assert.rejects(
            readFile(path.join(consumer, "src/components/ui/model-viewer/model-inspector.tsx")),
            { code: "ENOENT" },
          );
        }
        await compose(consumer, part);
        npm(["run", "build"], consumer);
      }
    } else {
      await add(consumer, "model-viewer");
      npm(["run", "build"], consumer);
    }
    assert.equal(
      await readFile(path.join(consumer, "src/style.css"), "utf8"),
      theme,
      "Host theme stays unchanged",
    );
    assert.equal(
      await readFile(path.join(consumer, "components.json"), "utf8"),
      settings,
      "Host configuration stays unchanged",
    );
    if (customButton)
      assert.equal(
        await readFile(path.join(consumer, "src/components/ui/button.tsx"), "utf8"),
        customButton,
        "Customized host button stays unchanged",
      );
    console.log(`Verified ${variant} (${config.style}).`);
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
