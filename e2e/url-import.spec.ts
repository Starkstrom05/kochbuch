import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth.json" });

test.describe("URL-Import", () => {
  test("Importieren-Seite lädt", async ({ page }) => {
    await page.goto("/rezepte/importieren");
    await expect(page.getByRole("heading", { name: "Rezept importieren" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Web-URL/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Foto/i })).toBeVisible();
  });

  test("Web-Import mit gemocktem API-Endpunkt", async ({ page }) => {
    // Mock the import API to return a predefined recipe immediately
    await page.route("/api/import/web", async (route) => {
      const body =
        `event: progress\ndata: ${JSON.stringify({ message: "Test läuft…" })}\n\n` +
        `event: result\ndata: ${JSON.stringify({
          method: "json-ld",
          sourceUrl: "https://example.com/rezept",
          recipe: {
            title: "Testrezept vom Import",
            description: "Importiert per Mock",
            servings: 4,
            prepTimeMinutes: 10,
            cookTimeMinutes: 20,
            ingredients: [{ name: "Testmehl", amount: 500, unit: "g", note: "" }],
            instructions: "1. Testen.\n2. Fertig.",
            tags: ["test"],
          },
        })}\n\n`;

      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        body,
      });
    });

    await page.goto("/rezepte/importieren");
    await page.getByPlaceholder(/chefkoch/i).fill("https://example.com/rezept");
    await page.getByRole("button", { name: /Rezept importieren/i }).click();

    // Wait for the editor to appear
    await expect(
      page.getByPlaceholder(/Merys Kartoffelsalat/i),
    ).toHaveValue("Testrezept vom Import", { timeout: 10_000 });
    await expect(page.getByText("Importiert via Schema.org")).toBeVisible();
  });

  test("Ungültige URL zeigt Fehlermeldung", async ({ page }) => {
    await page.route("/api/import/web", async (route) => {
      const body = `event: error\ndata: ${JSON.stringify({ message: "HTTP 404 beim Abrufen" })}\n\n`;
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        body,
      });
    });

    await page.goto("/rezepte/importieren");
    await page.getByPlaceholder(/chefkoch/i).fill("https://example.com/not-found");
    await page.getByRole("button", { name: /Rezept importieren/i }).click();
    await expect(page.getByText(/HTTP 404/)).toBeVisible({ timeout: 10_000 });
  });
});
