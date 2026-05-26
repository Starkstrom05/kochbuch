import { test as setup, expect } from "@playwright/test";
import path from "path";
import packageJson from "../package.json";

export const STORAGE_STATE = path.join(__dirname, ".auth.json");

setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/e-mail/i).fill("admin@kochbuch.local");
  await page.getByLabel(/passwort/i).fill("kochbuch");
  await page.getByRole("button", { name: /anmelden/i }).click();
  await expect(page).toHaveURL(/\/rezepte/);
  // Whats-New-Drawer sonst ueberdeckt Formularbuttons bei frischer LocalStorage.
  // Marker auf die aktuelle Version setzen, damit der Drawer nicht auto-oeffnet.
  await page.evaluate((version) => {
    window.localStorage.setItem("kochbuch.lastSeenReleaseNotes", version);
  }, packageJson.version);
  await page.context().storageState({ path: STORAGE_STATE });
});
