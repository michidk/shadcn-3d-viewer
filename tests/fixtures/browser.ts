import { test as base, expect, type Page } from "@playwright/test";

export { expect };
export const test = base.extend({
  browser: async ({ playwright }, provideBrowser) => {
    const browser = process.env.VIEWER_TEST_CDP
      ? await playwright.chromium.connectOverCDP(process.env.VIEWER_TEST_CDP)
      : await playwright.chromium.launch({
          args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        });
    await provideBrowser(browser);
    await browser.close();
  },
});

export async function ready(page: Page) {
  await page.goto("/");
  await page.locator('[data-slot="model-viewer"]').scrollIntoViewIfNeeded();
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(1500);
}
export async function cube(page: Page, name: string) {
  await page.getByRole("button", { name: "View cube options", exact: true }).click();
  await page.getByRole("menuitemradio", { name, exact: true }).click();
}
export async function canvasImage(page: Page) {
  return page.locator("canvas").evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());
}
export async function openRobot(page: Page) {
  await page.locator('input[type="file"]').setInputFiles("public/models/robot-expressive.glb");
}
