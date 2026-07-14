import { expect, test } from "@playwright/test";

test("home exposes the primary registration and login paths", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Firmador · Firmaliza/);
  await expect(page.getByRole("heading", { name: /Firma tus documentos/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Crear cuenta con ClaveÚnica" })).toHaveAttribute("href", "/register");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true, animations: "disabled" });
});

test("login remains usable on mobile", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-specific navigation check");
  await page.goto("/login");

  await expect(page.getByLabel("Correo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await expect(page).toHaveScreenshot("ingreso-mobile.png", { fullPage: true, animations: "disabled" });
});
