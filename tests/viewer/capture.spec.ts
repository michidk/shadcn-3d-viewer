import { expect, ready, test } from "../fixtures/browser";

test("capture can be enabled independently of the built-in UI", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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
