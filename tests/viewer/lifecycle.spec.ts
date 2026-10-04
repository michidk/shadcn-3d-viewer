import { readFile } from "node:fs/promises";
import { expect, ready, test } from "../fixtures/browser";

test("changing mode after a load error shows an error, never a stuck loader", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
    const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'error-mode-test';
    document.body.append(host);
    function Example() {
      const [mode, setMode] = React.useState('orbit');
      const [src, setSrc] = React.useState('/models/missing-mode-test.glb');
      return h(React.Fragment, null,
        h('button', { onClick: () => setMode('split') }, 'Switch mode'),
        h('button', { onClick: () => setSrc('/models/robot-expressive.glb') }, 'Switch source'),
        h(ModelViewer, { src, mode, height: 400, showRetry: true }));
    }
    ReactDOM.createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#error-mode-test");
  const viewer = host.locator('[data-slot="model-viewer"]');
  await expect(viewer).toHaveAttribute("data-state", "error");
  await host.getByRole("button", { name: "Switch mode" }).click();
  await expect(viewer).toHaveAttribute("data-viewer-mode", "split");
  await expect(viewer).toHaveAttribute("data-state", "error");
  await expect(viewer.locator(".viewer-loader")).toHaveCount(0);
  await host.getByRole("button", { name: "Switch source" }).click();
  await expect(viewer).toHaveAttribute("data-state", "ready");
});

test("concurrent viewers keep loading filenames and fallback data scoped to their own source", async ({
  page,
}) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/models/isolated-*.glb", async (route) => {
    await blocked;
    await route.abort();
  });
  try {
    await ready(page);
    await page.evaluate(`(async () => {
      const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
      const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
      const h = React.createElement;
      const host = document.createElement('div');
      host.id = 'isolated-load-test';
      document.body.append(host);
      ReactDOM.createRoot(host).render(h(React.Fragment, null,
        h(ModelViewer, { src: '/models/isolated-first.glb', height: 300, showFileName: true }),
        h(ModelViewer, { src: '/models/isolated-second.glb', height: 300,
          loadingFallback: progress => h('span', null, progress.item + '|' + progress.total) })));
    })()`);
    const viewers = page.locator("#isolated-load-test [data-slot='model-viewer']");
    await expect(viewers.nth(0)).toHaveAttribute("data-state", "loading");
    await expect(viewers.nth(1)).toHaveAttribute("data-state", "loading");
    await expect(viewers.nth(0).locator(".viewer-loader")).toContainText("isolated-first.glb");
    await expect(viewers.nth(0).locator(".viewer-loader")).not.toContainText("isolated-second.glb");
    await expect(viewers.nth(1).locator(".viewer-loader")).toHaveText(
      "/models/isolated-second.glb|0",
    );
  } finally {
    release();
  }
});

test("scene errors after readiness disable capture and can be retried", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
    const { createRoot } = ReactDOM;
    const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'late-error-test';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white';
    document.body.append(host);
    function SceneFailure({ fail }) {
      if (fail) throw new Error('Late scene failure');
      return null;
    }
    function Example() {
      const [fail, setFail] = React.useState(false);
      return h(React.Fragment, null,
        h('button', { onClick: () => setFail(true) }, 'Break scene'),
        h(ModelViewer, { src: '/models/robot-expressive.glb', showRetry: true,
          sceneContent: h(SceneFailure, { fail }), onError: () => setFail(false) }));
    }
    createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#late-error-test");
  const viewer = host.locator('[data-slot="model-viewer"]');
  await expect(viewer).toHaveAttribute("data-state", "ready");
  await host.getByRole("button", { name: "Break scene" }).click();
  await expect(viewer).toHaveAttribute("data-state", "error");
  await expect(host.getByRole("button", { name: "Screenshot options" })).toBeDisabled();
  await host.getByRole("button", { name: "Retry loading model" }).click();
  await expect(viewer).toHaveAttribute("data-state", "ready");
  await expect(host.getByRole("button", { name: "Screenshot options" })).toBeEnabled();
});

test("local model URLs are released on replacement and clear under Strict Mode", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const tracked = { created: [] as string[], revoked: [] as string[] };
    Object.assign(window, { trackedModelUrls: tracked });
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      if (blob instanceof File) tracked.created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      tracked.revoked.push(url);
      revoke(url);
    };
  });
  await ready(page);
  const buffer = await readFile("public/models/robot-expressive.glb");
  for (const name of ["first.glb", "second.glb"]) {
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name, mimeType: "model/gltf-binary", buffer });
    await expect(page.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  }
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const urls = await page.evaluate(
    () =>
      (
        window as unknown as {
          trackedModelUrls: { created: string[]; revoked: string[] };
        }
      ).trackedModelUrls,
  );
  expect(urls.created).toHaveLength(2);
  for (const url of urls.created)
    expect(urls.revoked.filter((value) => value === url)).toHaveLength(1);
});
