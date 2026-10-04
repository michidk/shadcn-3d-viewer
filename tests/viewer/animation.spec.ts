import { canvasImage, cube, expect, openRobot, ready, test } from "../fixtures/browser";

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
  const count = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("canvas")!;
      return (
        (
          window as unknown as { viewerFrames: WeakMap<HTMLCanvasElement, number> }
        ).viewerFrames.get(canvas) ?? 0
      );
    });
  async function expectDrawing(active: boolean) {
    await expect(root).toHaveAttribute("data-state", "ready");
    await expect
      .poll(async () => {
        const before = await count();
        await page.waitForTimeout(400);
        return (await count()) > before;
      })
      .toBe(active);
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

test("skinned model animates, pauses, resumes, switches clips and resets on replacement", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Rotate automatically" }).click();
  await openRobot(page);
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
  await expect(page.getByRole("complementary", { name: "Model inspector" })).toContainText(
    "Triangles",
  );
  const dimensions = await page.locator(".inspector-axis-values strong").allTextContents();
  expect(dimensions.map(Number).every((value) => value > 0 && value < 10)).toBe(true);
  await page.locator(".inspector-node:enabled").first().click();
  await expect(page.locator('.viewer-inspector li button[aria-pressed="true"]')).toHaveCount(1);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(page.getByRole("toolbar", { name: "Animation controls" })).toHaveCount(0);
  await openRobot(page);
  await expect(page.locator(".viewer-animation-name")).not.toHaveText("Walking");
});

test("an inline animation callback does not reset a chosen clip on parent rerender", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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
  const count = () =>
    page.evaluate(
      () =>
        (
          window as unknown as { animationFrames: WeakMap<HTMLCanvasElement, number> }
        ).animationFrames.get(document.querySelector("#playback-test canvas")!) ?? 0,
    );
  async function drawing(active: boolean) {
    await expect
      .poll(async () => {
        const before = await count();
        await page.waitForTimeout(150);
        return (await count()) > before;
      })
      .toBe(active);
  }
  await drawing(false);
  await host.getByRole("button", { name: "Toggle speed" }).click();
  await drawing(true);
  await drawing(false);
  await host.getByRole("button", { name: "Replay" }).click();
  await drawing(true);
  await drawing(false);
});
