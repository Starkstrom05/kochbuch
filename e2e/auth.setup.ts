import { test as setup, expect } from "@playwright/test";
import path from "path";

export const STORAGE_STATE = path.join(__dirname, ".auth.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-mail/i).fill("admin@kochbuch.local");
  await page.getByLabel(/passwort/i).fill("kochbuch");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/rezepte/);
  await page.context().storageState({ path: STORAGE_STATE });
});
