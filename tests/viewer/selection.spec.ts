import { expect, ready, test } from "../fixtures/browser";

test("loaded mesh selection survives shading and clears on empty space", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM, THREE, GLTFExporter } = await import('/tests/fixtures/viewer-runtime.ts');
    const { ModelViewer } = await import('/src/components/ui/model-viewer/index.ts');
    const root = new THREE.Group();
    root.name = 'Vehicle';
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1), new THREE.MeshStandardMaterial({ color: '#55a9b8' }));
    mesh.name = 'body_panel';
    root.add(mesh);
    const glb = await new GLTFExporter().parseAsync(root, { binary: true });
    const host = document.createElement('div');
    host.id = 'selection-fixture';
    host.style.cssText = 'position:fixed;inset:0;z-index:10;background:white';
    document.body.append(host);
    const h = React.createElement;
    const first = URL.createObjectURL(new Blob([glb]));
    const second = URL.createObjectURL(new Blob([glb]));
    function Fixture() {
      const [src, setSrc] = React.useState(first);
      const [selectedMesh, setSelectedMesh] = React.useState(null);
      return h(React.Fragment, null,
        h('button', { style: {position: 'absolute', top: 80, left: 10, zIndex: 30}, onClick: () => setSelectedMesh(null) }, 'Clear from host'),
        h('button', { style: {position: 'absolute', top: 80, left: 160, zIndex: 30}, onClick: () => setSrc(second) }, 'Replace source'),
        h(ModelViewer, {
          src, height: '100vh', environment: false, showOrientation: false, defaultInspectorOpen: true,
          selectedMesh,
          onSelectedMeshChange: id => { host.dataset.selected = id ?? ''; setSelectedMesh(id); },
        }));
    }
    ReactDOM.createRoot(host).render(h(Fixture));
  })()`);
  const host = page.locator("#selection-fixture");
  await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  await host.getByRole("button", { name: "body_panel Mesh", exact: true }).click();
  await host.getByRole("button", { name: "Close inspector", exact: true }).click();
  const orangePixels = () =>
    host.locator("canvas").evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = canvas.width;
      copy.height = canvas.height;
      const context = copy.getContext("2d")!;
      context.drawImage(canvas, 0, 0);
      const pixels = context.getImageData(0, 0, copy.width, copy.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 210 && pixels[i + 1] > 110 && pixels[i + 1] < 200 && pixels[i + 2] < 100)
          count++;
      }
      return count;
    });
  await expect.poll(orangePixels).toBeGreaterThan(100);
  const outlinePixels = await orangePixels();
  await host.screenshot({ path: testInfo.outputPath("selected-realistic.png") });
  await host.getByRole("button", { name: "Shading: realistic", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Solid", exact: true }).click();
  await host.screenshot({ path: testInfo.outputPath("selected-solid.png") });
  await expect.poll(orangePixels).toBeGreaterThan(100);
  expect(await orangePixels()).toBeLessThan(outlinePixels * 1.5);
  await expect(host).toHaveAttribute("data-selected", /0\//);
  await host.locator("[data-viewer-pane]").click({ position: { x: 50, y: 150 } });
  await expect(host).toHaveAttribute("data-selected", "");
  await expect.poll(orangePixels).toBe(0);
  const pane = host.locator("[data-viewer-pane]");
  const box = await pane.boundingBox();
  if (!box) throw new Error("Missing model pane");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(host).toHaveAttribute("data-selected", "");
  await pane.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(host).toHaveAttribute("data-selected", /0\//);
  await pane.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(host).toHaveAttribute("data-selected", /0\//);
  await host.locator('[data-slot="model-viewer"]').focus();
  await page.keyboard.press("Escape");
  await expect(host).toHaveAttribute("data-selected", "");
  await pane.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await host.getByRole("button", { name: "Clear from host" }).click();
  await expect.poll(orangePixels).toBe(0);
  await pane.click({ position: { x: box.width / 2, y: box.height / 2 } });
  await expect(host).toHaveAttribute("data-selected", /0\//);
  await host.getByRole("button", { name: "Replace source" }).click();
  await expect(host).toHaveAttribute("data-selected", "");
  await expect(host.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  await expect.poll(orangePixels).toBe(0);
});
