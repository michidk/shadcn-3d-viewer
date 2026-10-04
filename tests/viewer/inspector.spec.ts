import { expect, ready, test } from "../fixtures/browser";

test("standalone inspector accepts custom button and tooltip implementations", async ({ page }) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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

test("large inspectors bound rendered rows while searching the entire hierarchy", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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
