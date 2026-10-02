import { expect, test as base, type Page } from "@playwright/test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three-stdlib";
import { frameBounds, inspectModel, prepareAnimationBounds } from "../src/components/ui/model-viewer/model-inspection";
import { createViewerCameraStore } from "../src/components/ui/model-viewer/model-viewer-camera";

const test = base.extend({
  browser: async ({ playwright }, provideBrowser) => {
    const browser = process.env.VIEWER_TEST_CDP
      ? await playwright.chromium.connectOverCDP(process.env.VIEWER_TEST_CDP)
      : await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    await provideBrowser(browser);
    await browser.close();
  },
});

test("camera store publishes live views and validates arbitrary view commands", () => {
  const store = createViewerCameraStore();
  const received: string[] = [];
  const unsubscribe = store.subscribe(() => received.push(JSON.stringify(store.getSnapshot())));
  const view = { position: [2, 3, 4], target: [0, 0, 0] } as const;
  expect(store.setView({ position: [...view.position], target: [...view.target] })).toBe(false);
  const commands: Array<{ transition: boolean }> = [];
  store.register((_view, transition) => commands.push({ transition }));
  expect(store.setView({ position: [...view.position], target: [...view.target] }, { transition: false })).toBe(true);
  expect(commands).toEqual([{ transition: false }]);
  expect(store.setView({ position: [0, 0, 0], target: [0, 0, 0] })).toBe(false);
  expect(store.setView({ position: [Infinity, 0, 0], target: [0, 0, 0] })).toBe(false);
  store.publish({ position: [...view.position], target: [...view.target] });
  store.publish({ position: [...view.position], target: [...view.target] });
  expect(received).toHaveLength(1);
  store.register(null);
  expect(store.getSnapshot()).toBeNull();
  expect(received).toHaveLength(2);
  unsubscribe();
});

test("framing fits tiny, huge and offset objects at narrow aspect ratios", () => {
  for (const scale of [0.000001, 1, 1e6]) {
    const mesh = new Mesh(new BoxGeometry(2, 4, 6));
    mesh.scale.setScalar(scale);
    mesh.position.set(100 * scale, -20 * scale, 50 * scale);
    const frame = frameBounds(mesh, 0.25);
    expect(frame.center.toArray()).toEqual(mesh.position.toArray());
    expect(frame.near).toBeLessThan(frame.distance - frame.radius);
    expect(frame.far).toBeGreaterThan(frame.distance + frame.radius);
    expect(Math.asin(frame.radius / frame.distance)).toBeLessThan(Math.atan(Math.tan(21 * Math.PI / 180) * 0.25));
  }
});

test("inspection counts shared resources once and preserves hierarchy", () => {
  const root = new Group();
  const material = new MeshStandardMaterial({ map: new Texture() });
  root.add(new Mesh(new BoxGeometry(), material), new Mesh(new BoxGeometry(), material));
  const info = inspectModel(root);
  expect(info.triangles).toBe(24);
  expect(info.materials).toBe(1);
  expect(info.textures).toBe(1);
  expect(info.nodes.filter(node => node.mesh)).toHaveLength(2);
  expect(new Set(info.nodes.map(node => node.id)).size).toBe(3);
});

test("real skinned fixture retains its skeleton and a finite animation envelope", async () => {
  const bytes = await readFile("public/models/robot-expressive.glb");
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  const before: string[] = [];
  model.scene.traverse(object => before.push(object.uuid));
  prepareAnimationBounds(model.scene, model.animations);
  const after: string[] = [];
  model.scene.traverse(object => after.push(object.uuid));
  expect(after).toEqual(before);
  expect(model.animations.length).toBeGreaterThan(1);
  const bounds = frameBounds(model.scene, 1);
  expect(bounds.radius).toBeGreaterThan(3);
  expect(bounds.radius).toBeLessThan(10);
});

async function ready(page: Page) {
  await page.goto("/");
  await page.locator('[data-slot="model-viewer"]').scrollIntoViewIfNeeded();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1500);
}
async function cube(page: Page, name: string) {
  await page.getByRole("button", { name: "View cube options", exact: true }).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}
async function canvasImage(page: Page) {
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}

test("viewer menus do not lock scrolling or change the viewer width", async ({ page }) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await ready(page);
    const before = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      viewerWidth: document.querySelector(".model-viewer")!.getBoundingClientRect().width,
    }));
    await page.getByRole("button", { name: "Shading: realistic" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Solid" })).toBeVisible();
    const after = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      viewerWidth: document.querySelector(".model-viewer")!.getBoundingClientRect().width,
      bodyOverflow: getComputedStyle(document.body).overflow,
    }));
    expect(after.viewportWidth).toBe(before.viewportWidth);
    expect(after.viewerWidth).toBe(before.viewerWidth);
    expect(after.bodyOverflow).not.toBe("hidden");
    await page.getByRole("menuitemradio", { name: "Solid" }).click();
  }
});

test("viewer accepts standard ARIA naming and description with legacy alt fallback", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'accessibility-test';
    document.body.append(host);
    function Example() {
      const [phase, setPhase] = React.useState(0);
      const naming = phase === 0
        ? { 'aria-label': 'Direct viewer name' }
        : phase === 1 ? { 'aria-labelledby': 'model-name' } : {};
      return h(React.Fragment, null,
        h('h2', { id: 'model-name' }, 'Visible model name'),
        h('p', { id: 'model-description' }, 'A low-backed chair with curved arms.'),
        h('button', { onClick: () => setPhase((value) => value + 1) }, 'Change naming'),
        h(ModelViewer, { ...naming, alt: 'Legacy name', 'aria-describedby': 'model-description', height: 240, showCubes: false }));
    }
    ReactDOM.createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#accessibility-test");
  const viewer = host.locator('[data-slot="model-viewer"]');
  await expect(host.getByRole("group", { name: "Direct viewer name" })).toBeVisible();
  await expect(viewer).toHaveAttribute("aria-describedby", "model-description");
  await host.getByRole("button", { name: "Change naming" }).click();
  await expect(host.getByRole("group", { name: "Visible model name" })).toBeVisible();
  await expect(viewer).not.toHaveAttribute("aria-label");
  await host.getByRole("button", { name: "Change naming" }).click();
  await expect(host.getByRole("group", { name: "Legacy name" })).toBeVisible();
});

test("custom scene content and camera API support a synchronized arbitrary view", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
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
  await expect.poll(async () => {
    const camera = JSON.parse(await host.getAttribute("data-camera") ?? "null");
    return camera?.position.map((value: number) => Number(value.toFixed(2)));
  }).toEqual([4, 3, 5]);
});

test("grid stays visible around an animated model on desktop and phone", async ({ page }) => {
  await ready(page);
  await cube(page, "Off");
  await page.getByRole("button", { name: "Show grid", exact: true }).click();
  await page.getByRole("button", { name: "Try animated model" }).click();
  await expect(page.getByRole("toolbar", { name: "Animation controls" })).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('[data-slot="model-viewer"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    const visibleGrid = await canvasImage(page);
    await page.getByRole("button", { name: "Show grid", exact: true }).click();
    await page.waitForTimeout(200);
    expect(await canvasImage(page)).not.toBe(visibleGrid);
    await page.getByRole("button", { name: "Show grid", exact: true }).click();
    await expect(page.getByRole("button", { name: "Show grid", exact: true })).toHaveAttribute("aria-pressed", "true");
    const grid = await page.evaluate(`(async () => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const state = [..._roots.values()][0].store.getState();
      const pane = state.internal.subscribers.find(s => s.priority === 1).store.getState();
      let result;
      pane.scene.traverse(object => {
        const u = object.material?.uniforms;
        if (u?.fadeDistance) result = { fadeFrom: u.fadeFrom.value, fadeDistance: u.fadeDistance.value, sectionSize: u.sectionSize.value };
      });
      return result;
    })()`);
    expect(grid.fadeFrom).toBe(0);
    expect(grid.fadeDistance).toBeGreaterThan(18);
    expect(grid.sectionSize).toBeGreaterThan(1);
  }
});

test("demo starts rotating and mode changes stop and resume rendering", async ({ page }) => {
  await page.addInitScript(() => {
    const frames = new WeakMap<HTMLCanvasElement, number>();
    Object.assign(window, { viewerFrames: frames });
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      const canvas = this.canvas as HTMLCanvasElement;
      frames.set(canvas, (frames.get(canvas) ?? 0) + 1);
      return draw.apply(this, args);
    };
  });
  await ready(page);
  const root = page.locator('[data-slot="model-viewer"]');
  const rotate = page.getByRole("button", { name: "Rotate automatically" });
  const count = () => page.evaluate(() => {
    const canvas = document.querySelector("canvas")!;
    return (window as unknown as { viewerFrames: WeakMap<HTMLCanvasElement, number> }).viewerFrames.get(canvas) ?? 0;
  });
  async function expectDrawing(active: boolean) {
    await expect(root).toHaveAttribute("data-state", "ready");
    await expect.poll(async () => {
      const before = await count();
      await page.waitForTimeout(400);
      return (await count()) > before;
    }).toBe(active);
  }
  await expect(rotate).toHaveAttribute("aria-pressed", "true");
  await expectDrawing(true);
  await rotate.click();
  await expect(rotate).toHaveAttribute("aria-pressed", "false");
  await expectDrawing(false);
  await rotate.click();
  await expectDrawing(true);
  await page.getByRole("button", { name: "Four-view split" }).click();
  await expect(rotate).toBeDisabled();
  await expectDrawing(false);
  await page.getByRole("button", { name: "Orbit camera" }).click();
  await expect(rotate).toHaveAttribute("aria-pressed", "true");
  await expectDrawing(true);
});

test("camera movement does not trigger pixelated canvas regression", async ({ page }) => {
  await ready(page);
  await cube(page, "Drei cube");
  await page.evaluate(`(async () => {
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
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
  await page.mouse.move(pane.x + pane.width / 2 + 150, pane.y + pane.height / 2 + 60, { steps: 30 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.mouse.click(pane.x + pane.width - 84, pane.y + 76);
  await page.waitForTimeout(500);
  const samples = await page.evaluate(`(() => { clearInterval(window.viewerQualityTimer); return window.viewerQualitySamples; })()`);
  expect(samples.length).toBeGreaterThan(10);
  for (const sample of samples) {
    expect(sample.performance).toBe(1);
    expect(sample.dpr).toBeGreaterThanOrEqual(1);
    expect(sample.rendering).not.toBe("pixelated");
  }
});

test("grid colors are neutral grays in both lighting modes", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Show grid", exact: true }).click();
  for (const lighting of ["day", "night"]) {
    if (lighting === "night") {
      await page.getByRole("button", { name: "Lighting: day" }).click();
      await page.getByRole("menuitemradio", { name: "Night studio" }).click();
    }
    const colors = await page.evaluate(`(async () => {
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const state = [..._roots.values()][0].store.getState();
      const pane = state.internal.subscribers.find(s => s.priority === 1).store.getState();
      let result;
      pane.scene.traverse(object => {
        const uniforms = object.material?.uniforms;
        if (uniforms?.cellColor && uniforms?.sectionColor) {
          result = [uniforms.cellColor.value.toArray(), uniforms.sectionColor.value.toArray()];
        }
      });
      return result;
    })()`);
    expect(colors).toHaveLength(2);
    for (const [red, green, blue] of colors) {
      expect(red).toBeCloseTo(green, 8);
      expect(green).toBeCloseTo(blue, 8);
      expect(red).toBeGreaterThan(0);
    }
  }
});

test("solid mutes sample materials and the optional floor receives shadows", async ({ page }) => {
  await ready(page);
  const scene = () => page.evaluate(`(async () => {
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const state = [..._roots.values()][0].store.getState();
    const pane = state.internal.subscribers.find(s => s.priority === 1).store.getState();
    const objects = {};
    pane.scene.traverse(object => {
      if (['Cube', 'Viewer floor', 'Viewer floor shadows'].includes(object.name)) {
        objects[object.name] = { color: object.material?.color?.getHexString(), castShadow: object.castShadow, receiveShadow: object.receiveShadow };
      }
    });
    objects.__shadowMap = state.gl.shadowMap.enabled;
    return objects;
  })()`);
  const realistic = await scene();
  expect(realistic.__shadowMap).toBe(false);
  expect(realistic.Cube.color).toBe("b3c899");
  expect(realistic["Viewer floor"]).toBeUndefined();
  await page.getByRole("button", { name: "Shading: realistic" }).click();
  await page.getByRole("menuitemradio", { name: "Solid" }).click();
  const solid = await scene();
  expect(solid.Cube.color).toBe("a7aaa5");
  expect(solid.Cube.castShadow).toBe(true);
  await page.getByRole("button", { name: "Inspect model", exact: true }).click();
  await page.getByRole("textbox", { name: "Search hierarchy" }).fill("Cube");
  await page.locator(".viewer-inspector .inspector-node:enabled").click();
  expect((await scene()).Cube.color).toBe("e9c56a");
  await page.getByRole("button", { name: "Clear selection", exact: true }).click();
  await page.getByRole("button", { name: "Show floor" }).click();
  const withFloor = await scene();
  expect(withFloor.__shadowMap).toBe(true);
  expect(withFloor["Viewer floor"].color).toBe("f5f5f5");
  expect(withFloor["Viewer floor shadows"].receiveShadow).toBe(true);
  await page.getByRole("button", { name: "Lighting: day" }).click();
  await page.getByRole("menuitemradio", { name: "Outside sky" }).click();
  await expect(page.locator(".model-viewer")).toHaveClass(/is-outside/);
  expect((await scene())["Viewer floor"].color).toBe("dbe9ee");
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
    const copy = document.createElement("canvas"); copy.width = 1; copy.height = 1;
    const context = copy.getContext("2d")!; context.drawImage(canvas, 0, 0, 1, 1);
    return context.getImageData(0, 0, 1, 1).data[3] > 0;
  });
  expect(hasOpaquePixels).toBe(true);
  await cube(page, "Asset Studio");
  await page.waitForTimeout(300);
  expect(await canvasImage(page)).not.toBe(off);
  await page.getByRole("button", { name: "Orthographic view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Orthographic view", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Orthographic view", exact: true }).click();
  await expect(page.getByRole("button", { name: "Orthographic view", exact: true })).toHaveAttribute("aria-pressed", "false");
});

test("split panes pan independently without changing their fixed directions", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Four-view split" }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas")).toHaveCount(1);
  const directions = () => page.evaluate(`(async () => {
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
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
  await page.mouse.move(first.x + first.width / 2 + 100, first.y + first.height / 2 + 50, { steps: 20 });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1800);
  expect((await page.screenshot({ clip: first })).equals(beforeFirst)).toBe(false);
  const afterPan = await directions();
  expect(afterPan.slice(1)).toEqual(beforeDirections.slice(1));
  expect(afterPan[0].position).not.toEqual(beforeDirections[0].position);
  afterPan.forEach((camera: { quaternion: number[] }, i: number) => camera.quaternion.forEach((value, j) => expect(value).toBeCloseTo(beforeDirections[i].quaternion[j], 10)));
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(1500);
  const afterZoom = await directions();
  expect(afterZoom.slice(1)).toEqual(beforeDirections.slice(1));
  afterZoom.forEach((camera: { quaternion: number[] }, i: number) => camera.quaternion.forEach((value, j) => expect(value).toBeCloseTo(beforeDirections[i].quaternion[j], 10)));
});

test("skinned model animates, pauses, resumes, switches clips and resets on replacement", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Rotate automatically" }).click();
  await page.getByRole("button", { name: "Try animated model" }).click();
  await expect(page.getByRole("toolbar", { name: "Animation controls" })).toBeVisible();
  await expect(page.locator(".viewer-loader")).toHaveCount(0);
  await cube(page, "Off");
  await page.locator(".viewer-animation-name").click();
  await page.getByRole("menuitemradio", { name: "Walking", exact: true }).click();
  await page.getByRole("button", { name: "Play animation", exact: true }).click();
  await page.waitForTimeout(300);
  const playing = await canvasImage(page);
  await page.waitForTimeout(500);
  expect((await canvasImage(page)) !== playing).toBe(true);
  await page.getByRole("button", { name: "Pause animation", exact: true }).click();
  await page.waitForTimeout(300);
  const paused = await canvasImage(page);
  await page.waitForTimeout(400);
  expect((await canvasImage(page)) === paused).toBe(true);
  await page.getByRole("button", { name: "Restart animation" }).click();
  await page.waitForTimeout(200);
  expect((await canvasImage(page)) !== paused).toBe(true);
  await page.getByRole("button", { name: "Play animation", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Pause animation", exact: true }).click();
  await page.getByRole("button", { name: "Inspect model", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Model inspector" })).toContainText("Triangles");
  const dimensions = await page.locator(".inspector-axis-values strong").allTextContents();
  expect(dimensions.map(Number).every(value => value > 0 && value < 10)).toBe(true);
  await page.locator(".inspector-node:enabled").first().click();
  await expect(page.locator('.viewer-inspector li button[aria-pressed="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("toolbar", { name: "Animation controls" })).toHaveCount(0);
  await page.getByRole("button", { name: "Try animated model" }).click();
  await expect(page.locator(".viewer-animation-name")).not.toHaveText("Walking");
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

test("phone layout keeps the upload button and toolbar inside the component", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const upload = (await page.getByRole("button", { name: "Open model" }).boundingBox())!;
  expect(upload.x + upload.width).toBeLessThanOrEqual(390);
  const viewer = (await page.locator(".model-viewer").boundingBox())!;
  for (const button of await page.getByRole("toolbar", { name: "3D viewer controls" }).getByRole("button").all()) {
    const rect = (await button.boundingBox())!;
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewer.x + viewer.width);
  }
});

test("static split panes stop drawing when idle", async ({ page }) => {
  await page.addInitScript(() => {
    const counters = window as Window & { viewerDraws: number };
    counters.viewerDraws = 0;
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const original = prototype.drawElements;
      prototype.drawElements = function (...args) {
        counters.viewerDraws++;
        return original.apply(this, args);
      };
    }
  });
  await ready(page);
  await page.getByRole("button", { name: "Four-view split" }).click();
  await page.waitForTimeout(2000);
  const before = await page.evaluate(() => (window as Window & { viewerDraws: number }).viewerDraws);
  expect(before).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => (window as Window & { viewerDraws: number }).viewerDraws)).toBe(before);
});

test("tooltips and searchable inspector remain usable on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "Inspect model", exact: true }).hover();
  await expect(page.locator('[data-slot="tooltip-content"][data-open]')).toHaveText("Inspect model");
  await page.getByRole("button", { name: "Inspect model", exact: true }).click();
  const inspector = page.getByRole("complementary", { name: "Model inspector" });
  const search = page.getByRole("textbox", { name: "Search hierarchy" });
  await search.fill("Cube");
  await expect(inspector.locator(".inspector-node:enabled")).toHaveCount(1);
  await inspector.locator(".inspector-node:enabled").click();
  await expect(inspector.locator(".inspector-selection")).toContainText("Cube");
  await page.getByRole("button", { name: "Clear selection", exact: true }).click();
  await search.fill("no-such-object");
  await expect(inspector).toContainText("No objects match");
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.getByRole("button", { name: "Collapse Group", exact: true }).click();
  await expect(inspector.locator(".inspector-node:enabled")).toHaveCount(0);
  await page.getByRole("button", { name: "Expand Group", exact: true }).click();
  await expect(inspector.locator(".inspector-node:enabled")).toHaveCount(3);
  expect(await inspector.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  const panel = (await inspector.boundingBox())!;
  const footer = (await inspector.locator(".inspector-selection").boundingBox())!;
  expect(footer.y + footer.height).toBeLessThanOrEqual(panel.y + panel.height);
});

test("standalone inspector accepts custom button and tooltip implementations", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const h = React.createElement;
    const { createRoot } = ReactDOM;
    const { ModelInspector } = await import('/src/components/ui/model-viewer/model-inspector.tsx');
    const host = document.createElement('div');
    host.id = 'custom-inspector';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white';
    document.body.append(host);
    createRoot(host).render(h(ModelInspector, {
      inspection: { triangles: 12, materials: 1, textures: 0, dimensions: [1, 2, 3], nodes: [{ id: '0', name: 'Custom mesh', type: 'Mesh', depth: 0, mesh: true }] },
      onSelectMesh: id => host.dataset.selected = id,
      onClose: () => host.dataset.closed = 'true',
      components: {
        Button: ({ variant, size, ...props }) => h('button', { ...props, 'data-custom-button': 'true', 'data-variant': variant, 'data-size': size }),
        Tooltip: ({ content, children }) => h('span', { 'data-custom-tooltip': content }, children),
      },
    }));
  })()`);
  const inspector = page.locator("#custom-inspector");
  await expect(inspector.locator('[data-custom-tooltip="Close inspector"]')).toBeVisible();
  await inspector.getByRole("button", { name: "Custom mesh" }).click();
  await expect(inspector).toHaveAttribute("data-selected", "0");
  await inspector.getByRole("button", { name: "Close inspector" }).click();
  await expect(inspector).toHaveAttribute("data-closed", "true");
});

test("shadcn composition forwards props and refs and supports controlled custom toolbars", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ModelViewer, ModelViewerToolbar, ModelViewerToolbarGroup, ModelViewerToolbarButton } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'composition-test';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white;padding:16px';
    document.body.append(host);
    function Example() {
      const [grid, setGrid] = React.useState(false);
      return h('form', { onSubmit: e => { e.preventDefault(); host.dataset.submitted = 'true'; } },
        h(ModelViewer, {
          id: 'composed-viewer',
          ref: element => { host.dataset.refAssigned = String(element?.id === 'composed-viewer'); },
          className: 'rounded-none shadow-none',
          style: { height: 400 },
          'aria-label': 'Custom preview',
          showGrid: grid,
          onGridChange: setGrid,
          showOrientation: false,
          toolbar: h(ModelViewerToolbar, { 'aria-label': 'Custom controls' },
            h(ModelViewerToolbarGroup, { 'aria-label': 'Display options' },
              h(ModelViewerToolbarButton, { label: 'Custom grid', active: grid, onClick: () => setGrid(!grid), tooltip: 'Toggle reference lines' }, 'G'),
              h(ModelViewerToolbarButton, { label: 'Second action', tooltip: false }, 'S'))),
        }, h('span', { 'data-testid': 'custom-child' }, 'Additional overlay')));
    }
    ReactDOM.createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#composition-test");
  const viewer = host.getByRole("group", { name: "Custom preview", exact: true });
  await expect(viewer).toHaveAttribute("data-slot", "model-viewer");
  await expect(host).toHaveAttribute("data-ref-assigned", "true");
  await expect(viewer).toHaveCSS("border-radius", "0px");
  await expect(viewer).toHaveCSS("--tw-shadow", "0 0 #0000");
  await expect(viewer).toHaveCSS("height", "400px");
  await expect(host.getByTestId("custom-child")).toHaveText("Additional overlay");
  await expect(host.getByRole("toolbar", { name: "3D viewer controls" })).toHaveCount(0);
  const grid = host.getByRole("button", { name: "Custom grid", exact: true });
  await grid.click();
  await expect(grid).toHaveAttribute("data-state", "on");
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await expect(host).not.toHaveAttribute("data-submitted");
  await grid.focus();
  await page.keyboard.press("ArrowRight");
  await expect(host.getByRole("button", { name: "Second action" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(grid).toBeFocused();
  await grid.hover();
  await expect(page.locator('[data-slot="tooltip-content"][data-open]')).toHaveText("Toggle reference lines");
});

test("compound roots isolate state, respect controlled updates and mount scenes explicitly", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { createRoot } = ReactDOM;
    const { ModelViewerRoot, ModelViewerScene, ModelViewerDefaultToolbar, ModelViewerToolbar, ModelViewerToolbarGroup, ModelViewerToolbarButton, useModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'compound-test';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white;padding:16px;overflow:auto';
    document.body.append(host);
    function CustomActions() {
      const viewer = useModelViewer();
      return h(ModelViewerToolbar, { 'aria-label': 'Shared custom controls', className: 'top-20' },
        h(ModelViewerToolbarGroup, null,
          h(ModelViewerToolbarButton, { label: 'Shared grid', active: viewer.showGrid, onClick: () => viewer.setShowGrid(!viewer.showGrid),
            render: h('button', { 'data-rendered-control': 'grid' }),
            ref: element => host.dataset.renderRef = String(element?.dataset.renderedControl === 'grid') }, 'G')));
    }
    function Example() {
      const [mode, setMode] = React.useState('orbit');
      const [scene, setScene] = React.useState(false);
      return h(React.Fragment, null,
        h('button', { onClick: () => setMode(host.dataset.requested) }, 'Accept mode'),
        h('button', { onClick: () => setScene(!scene) }, 'Toggle scene'),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
          h(ModelViewerRoot, { id: 'first-root', height: 400, mode, showOrientation: false,
            ref: element => host.dataset.rootRef = String(element?.id === 'first-root'),
            onModeChange: value => { host.dataset.requested = value; host.dataset.requests = String(Number(host.dataset.requests || 0) + 1); } },
            scene && h(ModelViewerScene, { ref: element => host.dataset.sceneRef = String(!!element) }),
            h(ModelViewerDefaultToolbar),
            h(CustomActions)),
          h(ModelViewerRoot, { id: 'second-root', height: 400 }, h(ModelViewerDefaultToolbar))));
    }
    createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#compound-test");
  const first = host.locator("#first-root");
  const second = host.locator("#second-root");
  await expect(host).toHaveAttribute("data-root-ref", "true");
  await expect(host).toHaveAttribute("data-render-ref", "true");
  await expect(host.locator("canvas")).toHaveCount(0);
  await expect(first).toHaveAttribute("data-state", "idle");
  await expect(first.getByRole("button", { name: "Screenshot options" })).toBeDisabled();

  await first.getByRole("button", { name: "Shared grid" }).click();
  await expect(first.getByRole("button", { name: "Show grid", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(second.getByRole("button", { name: "Show grid", exact: true })).toHaveAttribute("aria-pressed", "false");
  await first.getByRole("button", { name: "Four-view split" }).click();
  await expect(host).toHaveAttribute("data-requested", "split");
  await expect(first).toHaveAttribute("data-viewer-mode", "orbit");
  await host.getByRole("button", { name: "Accept mode" }).click();
  await expect(first).toHaveAttribute("data-viewer-mode", "split");
  await expect(second).toHaveAttribute("data-viewer-mode", "orbit");
  await expect(host).toHaveAttribute("data-requests", "1");

  await host.getByRole("button", { name: "Toggle scene" }).click();
  await expect(first.locator("canvas")).toBeVisible();
  await expect(first).toHaveAttribute("data-state", "ready");
  await expect(host).toHaveAttribute("data-scene-ref", "true");
  await expect(first.locator(".viewer-view")).toHaveCount(4);
  await expect(first.getByRole("button", { name: "Screenshot options" })).toBeEnabled();
  const toolbar = await first.getByRole("toolbar", { name: "Shared custom controls" }).boundingBox();
  const pane = await first.locator(".viewer-view").first().boundingBox();
  expect(pane!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height);

  await host.getByRole("button", { name: "Toggle scene" }).click();
  await expect(first.locator("canvas")).toHaveCount(0);
  await expect(first).toHaveAttribute("data-state", "idle");
  await expect(first.getByRole("button", { name: "Screenshot options" })).toBeDisabled();
});

test("an inline animation callback does not reset a chosen clip on parent rerender", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'animation-rerender-test';
    document.body.append(host);
    function Example() {
      const [tick, setTick] = React.useState(0);
      return h(React.Fragment, null,
        h('button', { onClick: () => setTick(tick + 1) }, 'Rerender parent'),
        h('span', { id: 'render-count' }, tick),
        h(ModelViewer, { src: '/models/robot-expressive.glb', height: 400,
          onAnimationChange: value => { host.dataset.changes = String(Number(host.dataset.changes || 0) + 1); host.dataset.lastClip = value; } }));
    }
    ReactDOM.createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#animation-rerender-test");
  await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  const clip = host.locator(".viewer-animation-name");
  await clip.click();
  await page.getByRole("menuitemradio", { name: "Running" }).click();
  await expect(host.locator(".viewer-animation-name")).toHaveText("Running");
  await expect(host).toHaveAttribute("data-changes", "1");
  await host.getByRole("button", { name: "Rerender parent" }).click();
  await expect(host.locator("#render-count")).toHaveText("1");
  await expect(host.locator(".viewer-animation-name")).toHaveText("Running");
  await expect(host).toHaveAttribute("data-changes", "1");
});

test("changing mode after a load error shows an error, never a stuck loader", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
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

test("concurrent viewers keep loading filenames and fallback data scoped to their own source", async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/models/isolated-*.glb", async (route) => {
    await blocked;
    await route.abort();
  });
  try {
    await ready(page);
    await page.evaluate(`(async () => {
      const { default: React } = await import('/node_modules/.vite/deps/react.js');
      const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
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
    await expect(viewers.nth(1).locator(".viewer-loader")).toHaveText("/models/isolated-second.glb|0");
  } finally {
    release();
  }
});

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

test("scene errors after readiness disable capture and can be retried", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
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

test("a failed renderer download preserves the page and offers recovery", async ({ page }) => {
  const moduleUrl = "**/model-viewer/model-viewer.tsx*";
  await page.route(moduleUrl, (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Unable to load the viewer.");
  await page.unroute(moduleUrl);
  await page.getByRole("button", { name: "Reload page", exact: true }).click();
  await expect(page.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
});

test("local model URLs are released on replacement and clear under Strict Mode", async ({ page }) => {
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
    await page.locator('input[type="file"]').setInputFiles({ name, mimeType: "model/gltf-binary", buffer });
    await expect(page.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  }
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  const urls = await page.evaluate(() => (window as unknown as {
    trackedModelUrls: { created: string[]; revoked: string[] };
  }).trackedModelUrls);
  expect(urls.created).toHaveLength(2);
  for (const url of urls.created) expect(urls.revoked.filter((value) => value === url)).toHaveLength(1);
});

test("capture can be enabled independently of the built-in UI", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ModelViewer, useModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'capture-test';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white';
    document.body.append(host);
    const create = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob.type === 'image/png') window.capturedPng = blob;
      return create(blob);
    };
    function Controls() {
      const viewer = useModelViewer();
      return h('button', { style: { position: 'absolute', zIndex: 3 }, disabled: !viewer.canCapture,
        onClick: () => viewer.capture('download') }, 'Custom PNG');
    }
    function Example() {
      const [enabled, setEnabled] = React.useState(false);
      return h(React.Fragment, null,
        h('button', { onClick: () => setEnabled(!enabled) }, 'Toggle capture'),
        h(ModelViewer, { showUi: false, enableCapture: enabled }, h(Controls)));
    }
    ReactDOM.createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#capture-test");
  await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  await expect(host.getByRole("button", { name: "Custom PNG" })).toBeDisabled();
  await host.getByRole("button", { name: "Toggle capture" }).click();
  await expect(host.getByRole("button", { name: "Custom PNG" })).toBeEnabled();
  await host.getByRole("button", { name: "Custom PNG" }).click();
  await expect.poll(() => page.evaluate("window.capturedPng?.size ?? 0")).toBeGreaterThan(1000);
  const colors = await page.evaluate(`(async () => {
    const image = await createImageBitmap(window.capturedPng);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, 64, 64);
    image.close();
    return new Set(new Uint32Array(context.getImageData(0, 0, 64, 64).data.buffer)).size;
  })()`);
  expect(colors).toBeGreaterThan(10);
  await host.getByRole("button", { name: "Toggle capture" }).click();
  await expect(host.getByRole("button", { name: "Custom PNG" })).toBeDisabled();
});

test("fallback fullscreen contains focus, supports portaled menus and restores focus", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, "fullscreenEnabled", { get: () => false }));
  await ready(page);
  const originalOverflow = await page.evaluate(() => document.body.style.overflow);
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  const dialog = page.getByRole("dialog", { name: "Abstract sample objects" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(await page.locator("header.site-header").evaluate((element) => Boolean(element.closest("[inert]")))).toBe(true);
  // Programmatic focus cannot escape to background controls either.
  await page.getByRole("button", { name: "Copy install command", includeHidden: true }).evaluate((element: HTMLElement) => element.focus());
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await dialog.getByRole("button", { name: "Shading: realistic" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Solid", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await expect(page.getByRole("menu")).toHaveCount(0);
  const exit = dialog.getByRole("button", { name: "Exit fullscreen" });
  await exit.focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Shift+Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Enter fullscreen" })).toBeFocused();
  expect(await page.locator("header.site-header").evaluate((element) => Boolean(element.closest("[inert]")))).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(originalOverflow);
});

test("large inspectors bound rendered rows while searching the entire hierarchy", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ModelInspector } = await import('/src/components/ui/model-viewer/index.ts');
    const host = document.createElement('div');
    host.id = 'large-inspector';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white';
    document.body.append(host);
    const nodes = [{ id: '0', name: 'Scene', type: 'Group', depth: 0, mesh: false }];
    for (let i = 0; i < 1500; i++) nodes.push({ id: '0/' + i, name: 'Part ' + i, type: 'Mesh', depth: 1, mesh: true });
    ReactDOM.createRoot(host).render(React.createElement(ModelInspector, {
      inspection: { nodes, triangles: 0, materials: 0, textures: 0, dimensions: [1, 1, 1] },
      onSelectMesh: id => host.dataset.selected = id,
    }));
  })()`);
  const host = page.locator("#large-inspector");
  await expect(host.locator('[data-slot="model-inspector-node"]')).toHaveCount(200);
  await host.getByRole("button", { name: "Show 200 more objects" }).click();
  await expect(host.locator('[data-slot="model-inspector-node"]')).toHaveCount(400);
  await host.getByRole("textbox", { name: "Search hierarchy" }).fill("Part 1499");
  await expect(host.locator('[data-slot="model-inspector-node"]')).toHaveCount(2);
  await host.getByRole("button", { name: "Part 1499 Mesh", exact: true }).click();
  await expect(host).toHaveAttribute("data-selected", "0/1499");
  await host.getByRole("textbox", { name: "Search hierarchy" }).fill("");
  await expect(host.locator('[data-slot="model-inspector-node"]')).toHaveCount(200);
});

test("native fullscreen keeps menus and tooltips in the fullscreen element", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-slot"))).toBe("model-viewer");
  await page.getByRole("button", { name: "Shading: realistic" }).click();
  const solid = page.getByRole("menuitemradio", { name: "Solid", exact: true });
  await expect(solid).toBeVisible();
  expect(await solid.evaluate(element => document.fullscreenElement!.contains(element))).toBe(true);
  await page.keyboard.press("ArrowDown");
  expect(await page.evaluate(() => document.fullscreenElement!.contains(document.activeElement))).toBe(true);
  await solid.click();
  await expect(page.getByRole("button", { name: "Shading: solid" })).toBeVisible();
  await page.getByRole("button", { name: "Reset view", exact: true }).hover();
  const tooltip = page.locator('[data-slot="tooltip-content"][data-open]');
  await expect(tooltip).toBeVisible();
  expect(await tooltip.evaluate(element => document.fullscreenElement!.contains(element))).toBe(true);
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.getByRole("button", { name: "Shading: solid" }).click();
  await page.getByRole("menuitemradio", { name: "Realistic", exact: true }).click();
});

test("finished and zero-speed animations stop drawing and restart on demand", async ({ page }) => {
  await page.addInitScript(() => {
    const frames = new WeakMap<HTMLCanvasElement, number>();
    Object.assign(window, { animationFrames: frames });
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      const canvas = this.canvas as HTMLCanvasElement;
      frames.set(canvas, (frames.get(canvas) ?? 0) + 1);
      return draw.apply(this, args);
    };
  });
  await ready(page);
  await page.evaluate(`(async () => {
    const { default: React } = await import('/node_modules/.vite/deps/react.js');
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js');
    const { ModelViewer, useModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const h = React.createElement;
    const host = document.createElement('div');
    host.id = 'playback-test';
    host.style.cssText = 'position:fixed;inset:0;z-index:999;background:white';
    document.body.append(host);
    function Controls() {
      const viewer = useModelViewer();
      return h('button', { onClick: viewer.restartAnimation, style: { position: 'absolute', zIndex: 5 } }, 'Replay');
    }
    function Example() {
      const [speed, setSpeed] = React.useState(0);
      return h(React.Fragment, null,
        h('button', { onClick: () => setSpeed(speed ? 0 : 1) }, 'Toggle speed'),
        h(ModelViewer, { src: '/models/robot-expressive.glb', animation: 'Walking', loopAnimation: false,
          autoRotate: false, animationPlaying: true, animationSpeed: speed, showUi: false, showOrientation: false, respectReducedMotion: false }, h(Controls)));
    }
    ReactDOM.createRoot(host).render(h(Example));
  })()`);
  const host = page.locator("#playback-test");
  await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  const count = () => page.evaluate(() => (window as unknown as { animationFrames: WeakMap<HTMLCanvasElement, number> }).animationFrames.get(document.querySelector('#playback-test canvas')!) ?? 0);
  async function drawing(active: boolean) {
    await expect.poll(async () => {
      const before = await count();
      await page.waitForTimeout(150);
      return (await count()) > before;
    }).toBe(active);
  }
  await drawing(false);
  await host.getByRole('button', { name: 'Toggle speed' }).click();
  await drawing(true);
  await drawing(false);
  await host.getByRole('button', { name: 'Replay' }).click();
  await drawing(true);
  await drawing(false);
});
