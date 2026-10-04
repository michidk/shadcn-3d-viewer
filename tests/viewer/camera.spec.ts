import { canvasImage, cube, expect, ready, test } from "../fixtures/browser";

test("custom scene content and camera API support a synchronized arbitrary view", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
    const { ModelViewer, useModelViewer, useModelViewerCamera } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'custom-camera-test';
    document.body.prepend(host);
    function Gizmo() {
      const viewer = useModelViewer();
      React.useEffect(() => { host.dataset.sceneContent = 'mounted'; }, []);
      React.useEffect(() => { host.dataset.sceneMode = viewer.mode; }, [viewer.mode]);
      return h('group', { name: 'Custom gizmo' });
    }
    function Controls() {
      const viewer = useModelViewer();
      const camera = useModelViewerCamera();
      React.useEffect(() => { host.dataset.camera = JSON.stringify(camera); }, [camera]);
      return h('button', { style: { position: 'absolute', bottom: 12, left: 12, zIndex: 3 }, disabled: !camera, onClick: () => {
        host.dataset.command = String(viewer.setCameraView({ position: [4, 3, 5], target: [0, 0.5, 0] }, { transition: false }));
      } }, 'Custom angle');
    }
    ReactDOM.createRoot(host).render(h(ModelViewer, {
      height: 350, viewCube: false, pauseWhenHidden: false,
      sceneContent: h(Gizmo),
    }, h(Controls)));
  })()`);
  const host = page.locator("#custom-camera-test");
  await expect(host).toHaveAttribute("data-scene-content", "mounted");
  await expect(host).toHaveAttribute("data-scene-mode", "orbit");
  await expect(host.getByRole("button", { name: "Custom angle" })).toBeEnabled();
  await host.getByRole("button", { name: "Custom angle" }).click();
  await expect(host).toHaveAttribute("data-command", "true");
  await expect
    .poll(async () => {
      const camera = JSON.parse((await host.getAttribute("data-camera")) ?? "null");
      return camera?.position.map((value: number) => Number(value.toFixed(2)));
    })
    .toEqual([4, 3, 5]);
});

test("camera movement does not trigger pixelated canvas regression", async ({ page }) => {
  await ready(page);
  await cube(page, "Drei cube");
  await page.evaluate(`(async () => {
    const { _roots } = await import('/tests/fixtures/viewer-runtime.ts');
    const store = [..._roots.values()][0].store;
    window.viewerQualitySamples = [];
    window.viewerQualityTimer = setInterval(() => {
      const state = store.getState();
      window.viewerQualitySamples.push({
        performance: state.performance.current,
        dpr: state.viewport.dpr,
        rendering: getComputedStyle(state.gl.domElement).imageRendering,
      });
    }, 16);
  })()`);
  const pane = (await page.locator(".viewer-view").boundingBox())!;
  await page.mouse.move(pane.x + pane.width / 2, pane.y + pane.height / 2);
  await page.mouse.down();
  await page.mouse.move(pane.x + pane.width / 2 + 150, pane.y + pane.height / 2 + 60, {
    steps: 30,
  });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.mouse.click(pane.x + pane.width - 84, pane.y + 76);
  await page.waitForTimeout(500);
  const samples = await page.evaluate<
    Array<{ performance: number; dpr: number; rendering: string }>
  >(`(() => { clearInterval(window.viewerQualityTimer); return window.viewerQualitySamples; })()`);
  expect(samples.length).toBeGreaterThan(10);
  for (const sample of samples) {
    expect(sample.performance).toBe(1);
    expect(sample.dpr).toBeGreaterThanOrEqual(1);
    expect(sample.rendering).not.toBe("pixelated");
  }
});

test("orthographic toggle replaces presets and both view helpers render", async ({ page }) => {
  await ready(page);
  await expect(page.getByRole("button", { name: /Camera view:/ })).toHaveCount(0);
  await cube(page, "Off");
  const off = await canvasImage(page);
  await cube(page, "Drei cube");
  await page.waitForTimeout(300);
  expect(await canvasImage(page)).not.toBe(off);
  const pane = (await page.locator(".viewer-view").boundingBox())!;
  await page.mouse.click(pane.x + pane.width - 84, pane.y + 76);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(2000);
  // Regressing DPR during the camera tween must not leave an empty drawing buffer.
  const hasOpaquePixels = await page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = 1;
    copy.height = 1;
    const context = copy.getContext("2d")!;
    context.drawImage(canvas, 0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3] > 0;
  });
  expect(hasOpaquePixels).toBe(true);
  await cube(page, "Asset Studio");
  await page.waitForTimeout(300);
  expect(await canvasImage(page)).not.toBe(off);
  await page.getByRole("button", { name: "Orthographic view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Orthographic view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Orthographic view", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Orthographic view", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("split panes pan independently without changing their fixed directions", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Four-view split" }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas")).toHaveCount(1);
  const directions = () =>
    page.evaluate<
      Array<{ quaternion: number[]; position: number[]; zoom: number; aspect: number }>
    >(`(async () => {
    const { _roots } = await import('/tests/fixtures/viewer-runtime.ts');
    const state = [..._roots.values()][0].store.getState();
    return state.internal.subscribers.filter(s => s.priority > 0).map(s => {
      const { camera } = s.store.getState();
      return { quaternion: camera.quaternion.toArray(), position: camera.position.toArray(), zoom: camera.zoom, aspect: camera.aspect };
    });
  })()`);
  const beforeDirections = await directions();
  const panes = page.locator(".viewer-view");
  const first = (await panes.nth(0).boundingBox())!;
  expect(beforeDirections[0].aspect).toBeCloseTo(first.width / first.height, 5);
  const beforeFirst = await page.screenshot({ clip: first });
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(first.x + first.width / 2 + 100, first.y + first.height / 2 + 50, {
    steps: 20,
  });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1800);
  expect((await page.screenshot({ clip: first })).equals(beforeFirst)).toBe(false);
  const afterPan = await directions();
  expect(afterPan.slice(1)).toEqual(beforeDirections.slice(1));
  expect(afterPan[0].position).not.toEqual(beforeDirections[0].position);
  afterPan.forEach((camera: { quaternion: number[] }, i: number) =>
    camera.quaternion.forEach((value, j) =>
      expect(value).toBeCloseTo(beforeDirections[i].quaternion[j], 10),
    ),
  );
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(1500);
  const afterZoom = await directions();
  expect(afterZoom.slice(1)).toEqual(beforeDirections.slice(1));
  afterZoom.forEach((camera: { quaternion: number[] }, i: number) =>
    camera.quaternion.forEach((value, j) =>
      expect(value).toBeCloseTo(beforeDirections[i].quaternion[j], 10),
    ),
  );
});

test("fly fallback keeps moving on demand and stops when keys release", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Fly camera" }).click();
  await page.evaluate(() => document.dispatchEvent(new Event("pointerlockerror")));
  await expect(page.locator(".viewer-help")).toContainText("Drag to look");
  await page.locator(".viewer-view").click({ position: { x: 200, y: 200 } });
  const before = await canvasImage(page);
  await page.keyboard.down("w");
  await page.waitForTimeout(600);
  await page.keyboard.up("w");
  await page.waitForTimeout(200);
  const after = await canvasImage(page);
  expect(after).not.toBe(before);
  await page.waitForTimeout(300);
  expect(await canvasImage(page)).toBe(after);
});
