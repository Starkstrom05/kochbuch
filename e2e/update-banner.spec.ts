import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth.json" });

// Die echte /api/version holt die GitHub-Releases; hier gemockt, damit der
// Test deterministisch und ohne Netz laeuft (DSGVO: kein externer Call).
test.describe("Update-Banner", () => {
  test("erscheint bei verfügbarem Update", async ({ page }) => {
    await page.route("**/api/version", (route) =>
      route.fulfill({
        json: { current: "0.16.0", latest: "0.17.0", hasUpdate: true },
      }),
    );
    await page.goto("/rezepte");
    await expect(page.getByText(/Version/).filter({ hasText: "0.17.0" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Update-Anleitung/i })).toBeVisible();
  });

  test("kein Banner ohne Update", async ({ page }) => {
    await page.route("**/api/version", (route) =>
      route.fulfill({
        json: { current: "0.17.0", latest: "0.17.0", hasUpdate: false },
      }),
    );
    await page.goto("/rezepte");
    await expect(page.getByText(/ist verfügbar/i)).toHaveCount(0);
  });
});
