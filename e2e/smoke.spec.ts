import { test, expect } from "@playwright/test";

test.use({ storageState: "e2e/.auth.json" });

// Stable title within this test run
const RECIPE_TITLE = `E2E-Testkuchen ${Date.now()}`;

test.describe.serial("Happy path — Rezept anlegen und ansehen", () => {
  let recipeUrl = "";

  test("Rezeptliste lädt", async ({ page }) => {
    await page.goto("/rezepte");
    await expect(page.getByRole("heading", { name: "Rezeptbuch" })).toBeVisible();
  });

  test("Neues Rezept anlegen", async ({ page }) => {
    await page.goto("/rezepte/neu");
    await expect(page.getByRole("heading", { name: "Neues Rezept" })).toBeVisible();

    await page.getByPlaceholder(/Omas Kartoffelsalat/i).fill(RECIPE_TITLE);

    await page.locator('input[name="ing-amount"]').first().fill("200");
    await page.locator('input[name="ing-unit"]').first().fill("g");
    await page.locator('input[name="ing-name"]').first().fill("Testmehl");

    await page.locator('textarea[name="instructions"]').fill(
      "1. Testmehl abwiegen.\n2. Backen.\n3. Fertig.",
    );

    await page.getByRole("button", { name: /Rezept speichern/i }).click();
    await expect(page).toHaveURL(/\/rezepte\/.+/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: RECIPE_TITLE })).toBeVisible();
    recipeUrl = page.url();
  });

  test("Rezept-Detailseite zeigt Zutaten", async ({ page }) => {
    await page.goto(recipeUrl || "/rezepte");
    await expect(page.getByText("Testmehl").first()).toBeVisible();
  });

  test("PDF-Link ist vorhanden", async ({ page }) => {
    await page.goto(recipeUrl || "/rezepte");
    const pdfLink = page.getByRole("link", { name: /PDF/i });
    await expect(pdfLink).toBeVisible();
    await expect(pdfLink).toHaveAttribute("href", /\/api\/recipes\/.+\/pdf/);
  });

  test("Rezept zur Einkaufsliste hinzufügen", async ({ page }) => {
    await page.goto(recipeUrl || "/rezepte");
    await page.getByRole("button", { name: /Zur Einkaufsliste/i }).click();
    await expect(page).toHaveURL(/\/einkaufsliste/, { timeout: 10_000 });
    // The ingredient name appears as a list item
    await expect(page.getByText("Testmehl").first()).toBeVisible();
  });

  test("Einkaufsliste: Gruppe abhaken", async ({ page }) => {
    await page.goto("/einkaufsliste");
    // First group checkbox button
    const checkbox = page.locator("ul > li button").first();
    await expect(checkbox).toBeVisible();
    await checkbox.click();
    await expect(page.getByRole("button", { name: /Erledigte entfernen/i })).toBeVisible();
  });
});

test.describe("Auth-Schutz (ohne Login)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("/rezepte leitet unangemeldete Nutzer zu /login weiter", async ({ page }) => {
    await page.goto("/rezepte");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
