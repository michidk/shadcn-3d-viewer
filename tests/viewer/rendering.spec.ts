import { canvasImage, cube, expect, openRobot, ready, test } from "../fixtures/browser";

test("grid stays visible around an animated model on desktop and phone", async ({ page }) => {
  await ready(page);
  await cube(page, "Off");
  await page.getByRole("button", { name: "Show grid", exact: true }).click();
  await openRobot(page);
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
    await expect(page.getByRole("button", { name: "Show grid", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const grid = await page.evaluate<{
      fadeFrom: number;
      fadeDistance: number;
      sectionSize: number;
    }>(`(async () => {
      const { _roots } = await import('/tests/fixtures/viewer-runtime.ts');
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

test("grid colors are neutral grays in both lighting modes", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Show grid", exact: true }).click();
  for (const lighting of ["day", "night"]) {
    if (lighting === "night") {
      await page.getByRole("button", { name: "Lighting: day" }).click();
      await page.getByRole("menuitemradio", { name: "Night studio" }).click();
    }
    const colors = await page.evaluate<number[][]>(`(async () => {
      const { _roots } = await import('/tests/fixtures/viewer-runtime.ts');
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

test("studio environment refreshes when lighting changes", async ({ page }) => {
  await ready(page);
  const environmentId = () =>
    page.evaluate(`(() => {
      const { _roots } = window.__viewerFiber;
      const state = [..._roots.values()][0].store.getState();
      const pane = state.internal.subscribers.find(s => s.priority === 1).store.getState();
      return pane.scene.environment?.uuid;
    })()`);

  await page.evaluate(
    `import('/tests/fixtures/viewer-runtime.ts').then(module => { window.__viewerFiber = module; })`,
  );
  await expect.poll(environmentId).toBeTruthy();
  const dayEnvironment = await environmentId();

  await page.getByRole("button", { name: "Lighting: day" }).click();
  await page.getByRole("menuitemradio", { name: "Night studio" }).click();
  await expect(page.locator('[data-slot="model-viewer"]')).toHaveCSS(
    "background-color",
    "rgb(23, 36, 58)",
  );
  await expect.poll(environmentId).not.toBe(dayEnvironment);
  const nightEnvironment = await environmentId();

  await page.getByRole("button", { name: "Lighting: night" }).click();
  await page.getByRole("menuitemradio", { name: "Day studio" }).click();
  await expect.poll(environmentId).not.toBe(nightEnvironment);
});

test("solid mutes sample materials and the optional floor receives shadows", async ({ page }) => {
  await ready(page);
  const scene = () =>
    page.evaluate<{
      Cube: { color: string; castShadow: boolean };
      "Viewer floor"?: { color: string };
      "Viewer floor shadows"?: { receiveShadow: boolean };
      __outline?: { color: string };
      __shadowMap: boolean;
    }>(`(async () => {
    const { _roots } = await import('/tests/fixtures/viewer-runtime.ts');
    const state = [..._roots.values()][0].store.getState();
    const pane = state.internal.subscribers.find(s => s.priority === 1).store.getState();
    const objects = {};
    pane.scene.traverse(object => {
      if (['Cube', 'Viewer floor', 'Viewer floor shadows'].includes(object.name)) {
        objects[object.name] = { color: object.material?.color?.getHexString(), castShadow: object.castShadow, receiveShadow: object.receiveShadow };
      }
      if (object.name === 'Viewer selection outline') {
        objects.__outline = { color: object.children[0]?.material?.color?.getHexString() };
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
  expect((await scene()).Cube.color).toBe("a7aaa5");
  await expect.poll(async () => (await scene()).__outline?.color).toBe("f2a93b");
  await page.getByRole("button", { name: "Clear selection", exact: true }).click();
  await expect.poll(async () => (await scene()).__outline).toBeUndefined();
  await page.getByRole("button", { name: "Show floor" }).click();
  const withFloor = await scene();
  expect(withFloor.__shadowMap).toBe(true);
  expect(withFloor["Viewer floor"]?.color).toBe("f5f5f5");
  expect(withFloor["Viewer floor shadows"]?.receiveShadow).toBe(true);
  await page.getByRole("button", { name: "Lighting: day" }).click();
  await page.getByRole("menuitemradio", { name: "Outside sky" }).click();
  await expect(page.locator(".model-viewer")).toHaveClass(/is-outside/);
  expect((await scene())["Viewer floor"]?.color).toBe("dbe9ee");
});

test("static split panes stop drawing when idle", async ({ page }) => {
  await page.addInitScript(() => {
    const counters = window as unknown as Window & { viewerDraws: number };
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
  const before = await page.evaluate(
    () => (window as unknown as Window & { viewerDraws: number }).viewerDraws,
  );
  expect(before).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  expect(
    await page.evaluate(() => (window as unknown as Window & { viewerDraws: number }).viewerDraws),
  ).toBe(before);
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
