import { expect, test as base, type Page } from "@playwright/test";

const test = base.extend({
  browser: async ({ playwright }, provideBrowser) => {
    const browser = process.env.VIEWER_TEST_CDP
      ? await playwright.chromium.connectOverCDP(process.env.VIEWER_TEST_CDP)
      : await playwright.chromium.launch({
          args: [
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
          ],
        });
    await provideBrowser(browser);
    await browser.close();
  },
});

async function openStory(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`);
}

test("Storybook manager and docs render the live viewer", async ({ page }) => {
  await page.goto("/?path=/story/viewer-model-viewer--playground");
  const preview = page.frameLocator("#storybook-preview-iframe");
  await expect(preview.locator("canvas")).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("tab", { name: "Controls" })).toBeVisible();
  await page.goto("/?path=/docs/viewer-model-viewer--docs");
  await expect(
    preview.getByRole("heading", { name: "Model Viewer", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(preview.locator("canvas")).toHaveCount(1);
});

test("storybook indexes all examples and the playground controls stay interactive", async ({
  page,
  request,
}) => {
  const response = await request.get("/index.json");
  expect(response.ok()).toBe(true);
  const index = await response.json();
  expect(
    Object.values(index.entries).filter(
      (entry) => (entry as { type: string }).type === "story",
    ),
  ).toHaveLength(19);
  await openStory(page, "viewer-model-viewer--playground");
  await expect(page.locator("canvas")).toBeVisible();
  const grid = page.getByRole("button", { name: "Show grid", exact: true });
  await grid.click();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Four-view split" }).click();
  await expect(page.locator(".viewer-view")).toHaveCount(4);
});

test("animated example loads the bundled model and plays", async ({ page }) => {
  await openStory(page, "viewer-model-viewer--animated-model");
  await expect(
    page.getByRole("toolbar", { name: "Animation controls" }),
  ).toBeVisible();
  await expect(page.locator(".viewer-animation-name")).toContainText("Walking");
  await page
    .getByRole("button", { name: "Play animation", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Pause animation", exact: true }),
  ).toBeVisible();
});

test("default corner controls stay separated at desktop and phone widths", async ({ page }) => {
  await openStory(page, "viewer-model-viewer--animated-model");
  const viewer = page.locator('[data-slot="model-viewer"]');
  const fullscreen = page.locator('[data-slot="model-viewer-fullscreen"]');
  const animation = page.getByRole("toolbar", { name: "Animation controls" });
  await expect(animation).toBeVisible();
  for (const width of [1280, 720, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const root = (await viewer.boundingBox())!;
    const button = (await fullscreen.boundingBox())!;
    const panel = (await animation.boundingBox())!;
    expect(button.y - root.y).toBeLessThan(20);
    expect(root.x + root.width - button.x - button.width).toBeLessThan(20);
    expect(root.y + root.height - panel.y - panel.height).toBeLessThan(20);
    expect(root.x + root.width - panel.x - panel.width).toBeLessThan(20);
    const hint = (await page.locator('[data-slot="model-viewer-status"]').boundingBox())!;
    expect(hint.x + hint.width <= panel.x || hint.y + hint.height <= panel.y).toBe(true);
    const toolbar = (await page.locator('.viewer-toolbar-top').boundingBox())!;
    expect(toolbar.x + toolbar.width).toBeLessThanOrEqual(button.x);
  }
});

test("custom toolbar and inspector examples support their controlled state", async ({
  page,
}) => {
  await openStory(page, "composition-custom-controls--custom-toolbar");
  await expect(
    page.getByRole("toolbar", { name: "Custom display controls" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Fly camera" })).toHaveCount(0);
  const projection = page.getByRole("button", {
    name: "Orthographic view",
    exact: true,
  });
  await projection.click();
  await expect(projection).toHaveAttribute("aria-pressed", "true");
  await openStory(page, "inspector-model-inspector--hierarchy");
  await page.getByRole("textbox", { name: "Search hierarchy" }).fill("Seat");
  await page
    .getByRole("button", { name: "Seat cushion Mesh", exact: true })
    .click();
  await expect(page.locator(".inspector-selection")).toContainText(
    "Seat cushion",
  );
});

test("error story shows a recoverable model error", async ({ page }) => {
  await openStory(page, "viewer-model-viewer--error-state");
  await expect(page.getByRole("alert")).toContainText(
    "Unable to load model",
  );
  await expect(page.getByRole("alert")).not.toContainText("intentional-missing-model");
  await expect(
    page.getByRole("button", { name: "Screenshot options" }),
  ).toBeDisabled();
});

for (const example of ["animated-model", "loading-file-name", "custom-feedback", "hidden-feedback"]) {
  test(`${example} loading feedback follows its props`, async ({ page }) => {
    let release!: () => void;
    const blocked = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/models/*.glb", async (route) => {
      await blocked;
      await route.abort();
    });
    try {
      await openStory(page, `viewer-model-viewer--${example}`);
      await expect(page.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "loading");
      const loader = page.locator(".viewer-loader");
      if (example === "hidden-feedback") {
        await expect(loader).toHaveCount(0);
      } else if (example === "custom-feedback") {
        await expect(loader).toHaveText("Preparing your preview…");
        await expect(loader.locator("svg")).toHaveCount(0);
      } else {
        await expect(loader).toContainText("Loading model…");
        await expect(loader.locator(".viewer-loader-spinner")).toBeVisible();
        if (example === "loading-file-name") {
          await expect(loader).toContainText("robot-expressive.glb");
        } else {
          await expect(loader).not.toContainText("robot-expressive.glb");
        }
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expect(loader.locator("svg")).toHaveCSS("animation-name", "none");
        for (const width of [1280, 390]) {
          await page.setViewportSize({ width, height: 800 });
          await page.screenshot({ path: `test-results/${example}-${width}.png` });
        }
      }
    } finally {
      release();
    }
    await expect(page.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "error");
    if (example === "hidden-feedback") {
      await expect(page.locator(".viewer-error-wrap")).toHaveCount(0);
    } else if (example === "custom-feedback") {
      await expect(page.getByRole("alert")).toHaveText("Preview unavailable. Choose another model.");
    }
  });
}

test("minimal embed has no orientation helper or toolbar", async ({ page }) => {
  await openStory(page, "viewer-model-viewer--minimal-embed");
  await expect(page.locator('[data-slot="model-viewer"]')).toHaveAttribute("data-state", "ready");
  await expect(page.getByRole("toolbar")).toHaveCount(0);
  await page.screenshot({ path: "test-results/minimal-embed.png" });
});

for (const theme of ["light", "dark"]) {
  test(`Base UI menus, tooltips and keyboard focus work in ${theme} mode`, async ({
    page,
  }) => {
    await page.goto(
      `/iframe.html?id=viewer-model-viewer--playground&viewMode=story&globals=theme:${theme}`,
    );
    if (theme === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/);
    } else {
      await expect(page.locator("html")).not.toHaveClass(/dark/);
    }

    const shading = page.getByRole("button", { name: "Shading: realistic" });
    await shading.focus();
    await page.keyboard.press("ArrowDown");
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await expect(
      page.getByRole("menuitemradio", { name: "Realistic", exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole("menuitemradio", { name: "Realistic", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await expect(
      page.getByRole("menuitemradio", { name: "Solid", exact: true }),
    ).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(menu).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Shading: solid" }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(
      page.getByRole("menuitemradio", { name: "Solid", exact: true }),
    ).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");

    const cube = page.getByRole("button", { name: "View cube options" });
    await cube.click();
    const popover = await page
      .locator("html")
      .evaluate((element) =>
        getComputedStyle(element).getPropertyValue("--popover").trim(),
      );
    await expect(menu).toHaveCSS("background-color", popover);
    await page.keyboard.press("Escape");
    await expect(cube).toBeFocused();
    await expect(menu).not.toBeVisible();

    const grid = page.getByRole("button", { name: "Show grid", exact: true });
    await grid.hover();
    // Base UI tooltips are visual labels; accessible names live on the buttons.
    await expect(
      page.locator('[data-slot="tooltip-content"][data-open]'),
    ).toHaveText("Show grid");
    await grid.click();
    await expect(grid).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("button button")).toHaveCount(0);
  });
}

test("custom Base UI buttons and tooltips compose with menu triggers", async ({
  page,
}) => {
  await openStory(
    page,
    "composition-custom-controls--custom-button-and-tooltip",
  );
  const cube = page.getByRole("button", { name: "View cube options" });
  await expect(cube).toHaveClass(/rounded-full/);
  await cube.hover();
  await expect(
    page.locator('[data-slot="tooltip-content"][data-open]'),
  ).toHaveText("View cube options");
  await cube.click();
  await expect(
    page.getByRole("menuitemradio", { name: "Asset Studio", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("menuitemradio", { name: "Drei cube", exact: true })
    .click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(cube).toBeFocused();
  await expect(page.locator("button button")).toHaveCount(0);
});

test("compound parts render an animated scene and share inspector state", async ({
  page,
}) => {
  await openStory(page, "composition-custom-controls--compound-viewer");
  await expect(
    page.locator('[data-slot="model-viewer-scene"] canvas'),
  ).toBeVisible();
  await expect(
    page.getByRole("toolbar", { name: "Animation controls" }),
  ).toBeVisible();
  await page.locator(".viewer-animation-name").click();
  await expect(
    page.getByRole("menuitemradio", { name: "Walking", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page
    .getByRole("menuitemradio", { name: "Running", exact: true })
    .click();
  await expect(page.locator(".viewer-animation-name")).toContainText("Running");
  await expect(page.getByRole("menu")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Inspect model", exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Model inspector" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close inspector", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect model", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("render composition preserves state, refs, native props and button sizing", async ({
  page,
}) => {
  await openStory(page, "composition-custom-controls--render-composition");
  const grid = page.getByRole("button", { name: "Show grid", exact: true });
  await expect(grid).toHaveAttribute("data-custom-render", "grid");
  await expect(grid).toHaveClass(/rounded-full/);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    // Default shadcn/Nova button height; viewer CSS must not shrink it.
    await expect(grid).toHaveCSS("height", "32px");
    await grid.click();
    await expect(grid).toHaveAttribute(
      "aria-pressed",
      width === 1280 ? "true" : "false",
    );
    await expect(page.locator("button button")).toHaveCount(0);
  }
});
