import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_OPERATOR_EMAIL;
const password = process.env.PLAYWRIGHT_OPERATOR_PASSWORD;

test.describe("authenticated operator", () => {
  test.skip(!email || !password, "Set PLAYWRIGHT_OPERATOR_EMAIL and PLAYWRIGHT_OPERATOR_PASSWORD to use a controlled seed account");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Correo").fill(email!);
    await page.getByLabel("Contraseña").fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  for (const route of ["/dashboard", "/identity", "/history", "/balance"] as const) {
    test(`${route} renders the authenticated shell`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByLabel("Navegación principal").first()).toBeVisible();
      await expect(page.locator("main h1").first()).toBeVisible();
      await expect(page).toHaveScreenshot(`${route.slice(1)}.png`, { fullPage: true, animations: "disabled" });
    });
  }
});
