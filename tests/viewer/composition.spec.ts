import { expect, ready, test } from "../fixtures/browser";

test("shadcn composition forwards props and refs and supports controlled custom toolbars", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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
  await expect(page.locator('[data-slot="tooltip-content"][data-open]')).toHaveText(
    "Toggle reference lines",
  );
});

test("compound roots isolate state, respect controlled updates and mount scenes explicitly", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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
  await expect(first.getByRole("button", { name: "Show grid", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(second.getByRole("button", { name: "Show grid", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
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
  const toolbar = await first
    .getByRole("toolbar", { name: "Shared custom controls" })
    .boundingBox();
  const pane = await first.locator(".viewer-view").first().boundingBox();
  expect(pane!.y).toBeGreaterThanOrEqual(toolbar!.y + toolbar!.height);

  await host.getByRole("button", { name: "Toggle scene" }).click();
  await expect(first.locator("canvas")).toHaveCount(0);
  await expect(first).toHaveAttribute("data-state", "idle");
  await expect(first.getByRole("button", { name: "Screenshot options" })).toBeDisabled();
});
