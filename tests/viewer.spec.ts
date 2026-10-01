import { expect, test as base, type Page } from "@playwright/test";
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from "three";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three-stdlib";
import { frameBounds, inspectModel, prepareAnimationBounds } from "../src/components/ui/model-viewer/model-inspection";

const test = base.extend({
  browser: async ({ playwright }, provideBrowser) => {
    const browser = process.env.VIEWER_TEST_CDP
      ? await playwright.chromium.connectOverCDP(process.env.VIEWER_TEST_CDP)
      : await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
    await provideBrowser(browser);
    await browser.close();
  },
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
  await page.locator(".model-viewer").scrollIntoViewIfNeeded();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1500);
}
async function cube(page: Page, name: string) {
  await page.getByRole("button", { name: "View cube options", exact: true }).click();
  await page.getByRole("menuitem", { name, exact: true }).click();
}
async function canvasImage(page: Page) {
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}

test("orthographic toggle replaces presets and both view helpers render", async ({ page }) => {
  await ready(page);
  await expect(page.getByRole("button", { name: /Camera view:/ })).toHaveCount(0);
  await cube(page, "Off");
  const off = await canvasImage(page);
  await cube(page, "Drei cube");
  await page.waitForTimeout(300);
  expect(await canvasImage(page)).not.toBe(off);
  const pane = (await page.locator(".viewer-view").boundingBox())!;
  await page.mouse.click(pane.x + pane.width - 84, pane.y + pane.height - 93);
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

test("split dragging changes only the selected pane", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Four-view split" }).click();
  await page.waitForTimeout(1500);
  await expect(page.locator("canvas")).toHaveCount(1);
  const panes = page.locator(".viewer-view");
  const first = (await panes.nth(0).boundingBox())!;
  const second = (await panes.nth(1).boundingBox())!;
  const beforeFirst = await page.screenshot({ clip: first });
  const beforeSecond = await page.screenshot({ clip: second });
  await page.mouse.move(first.x + first.width / 2, first.y + first.height / 2);
  await page.mouse.down();
  await page.mouse.move(first.x + first.width / 2 + 100, first.y + first.height / 2 + 50, { steps: 20 });
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1800);
  expect((await page.screenshot({ clip: first })).equals(beforeFirst)).toBe(false);
  expect((await page.screenshot({ clip: second })).equals(beforeSecond)).toBe(true);
});

test("skinned model animates, pauses, resumes, switches clips and resets on replacement", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Try animated model" }).click();
  await expect(page.getByRole("toolbar", { name: "Animation controls" })).toBeVisible();
  await expect(page.locator(".viewer-loader")).toHaveCount(0);
  await cube(page, "Off");
  await page.locator(".viewer-animation-name").click();
  await page.getByRole("menuitem", { name: "Walking", exact: true }).click();
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
  await expect(page.getByRole("complementary", { name: "Model inspector" })).toContainText("triangles");
  const dimensions = await page.locator(".viewer-inspector p").nth(1).textContent();
  expect(dimensions?.split(":")[1].split("×").map(Number).every(value => value > 0 && value < 10)).toBe(true);
  await page.locator(".viewer-inspector li button:enabled").first().click();
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
