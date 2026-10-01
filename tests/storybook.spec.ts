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
  ).toHaveLength(14);
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
    "Could not display this model",
  );
  await expect(
    page.getByRole("button", { name: "Screenshot options" }),
  ).toBeDisabled();
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
      page.getByRole("menuitem", { name: "realistic", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(menu).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Shading: solid" }),
    ).toBeFocused();

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
  await page.getByRole("menuitem", { name: "Drei cube", exact: true }).click();
  await expect(page.getByRole("menu")).not.toBeVisible();
  await expect(cube).toBeFocused();
  await expect(page.locator("button button")).toHaveCount(0);
});
