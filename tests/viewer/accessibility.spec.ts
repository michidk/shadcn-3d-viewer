import { expect, ready, test } from "../fixtures/browser";

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

test("viewer accepts standard ARIA naming and description with legacy alt fallback", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(`(async () => {
    const { React, ReactDOM } = await import('/tests/fixtures/viewer-runtime.ts');
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

test("phone layout keeps the upload button and toolbar inside the component", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const upload = (await page.getByRole("button", { name: "Open model" }).boundingBox())!;
  expect(upload.x + upload.width).toBeLessThanOrEqual(390);
  const viewer = (await page.locator(".model-viewer").boundingBox())!;
  for (const button of await page
    .getByRole("toolbar", { name: "3D viewer controls" })
    .getByRole("button")
    .all()) {
    const rect = (await button.boundingBox())!;
    expect(rect.x + rect.width).toBeLessThanOrEqual(viewer.x + viewer.width);
  }
});

test("tooltips and searchable inspector remain usable on phones", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "Inspect model", exact: true }).hover();
  await expect(page.locator('[data-slot="tooltip-content"][data-open]')).toHaveText(
    "Inspect model",
  );
  await page.getByRole("button", { name: "Inspect model", exact: true }).click();
  const inspector = page.getByRole("complementary", { name: "Model inspector" });
  await expect(inspector).toHaveAttribute("data-position", "right");
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
  expect(await inspector.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  );
  const panel = (await inspector.boundingBox())!;
  const viewer = (await page.locator('[data-slot="model-viewer"]').boundingBox())!;
  const footer = (await inspector.locator(".inspector-selection").boundingBox())!;
  expect(viewer.x + viewer.width - panel.x - panel.width).toBeLessThan(12);
  expect(footer.y + footer.height).toBeLessThanOrEqual(panel.y + panel.height);
});

test("fallback fullscreen contains focus, supports portaled menus and restores focus", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, "fullscreenEnabled", { get: () => false }),
  );
  await ready(page);
  const originalOverflow = await page.evaluate(() => document.body.style.overflow);
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  const dialog = page.getByRole("dialog", { name: "Abstract sample objects" });
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(
    await page
      .locator("header.site-header")
      .evaluate((element) => Boolean(element.closest("[inert]"))),
  ).toBe(true);
  // Programmatic focus cannot escape to background controls either.
  await page
    .getByRole("button", { name: "Copy install command", includeHidden: true })
    .evaluate((element: HTMLElement) => element.focus());
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
  expect(
    await page
      .locator("header.site-header")
      .evaluate((element) => Boolean(element.closest("[inert]"))),
  ).toBe(false);
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(originalOverflow);
});

test("native fullscreen keeps menus and tooltips in the fullscreen element", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-slot")))
    .toBe("model-viewer");
  await page.getByRole("button", { name: "Shading: realistic" }).click();
  const solid = page.getByRole("menuitemradio", { name: "Solid", exact: true });
  await expect(solid).toBeVisible();
  expect(await solid.evaluate((element) => document.fullscreenElement!.contains(element))).toBe(
    true,
  );
  await page.keyboard.press("ArrowDown");
  expect(
    await page.evaluate(() => document.fullscreenElement!.contains(document.activeElement)),
  ).toBe(true);
  await solid.click();
  await expect(page.getByRole("button", { name: "Shading: solid" })).toBeVisible();
  await page.getByRole("button", { name: "Reset view", exact: true }).hover();
  const tooltip = page.locator('[data-slot="tooltip-content"][data-open]');
  await expect(tooltip).toBeVisible();
  expect(await tooltip.evaluate((element) => document.fullscreenElement!.contains(element))).toBe(
    true,
  );
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  await page.getByRole("button", { name: "Shading: solid" }).click();
  await page.getByRole("menuitemradio", { name: "Realistic", exact: true }).click();
});

test("a rejected native fullscreen exit reports an error instead of expanding the fallback", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Enter fullscreen" }).click();
  await expect
    .poll(() => page.evaluate(() => document.fullscreenElement?.getAttribute("data-slot")))
    .toBe("model-viewer");
  await page.evaluate(() => {
    document.exitFullscreen = () => Promise.reject(new Error("Exit denied"));
  });
  await page.getByRole("button", { name: "Exit fullscreen" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Could not exit fullscreen" }),
  ).toBeVisible();
  await expect(page.locator('[data-slot="model-viewer"][aria-modal="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => document.fullscreenElement?.getAttribute("data-slot"))).toBe(
    "model-viewer",
  );
});
