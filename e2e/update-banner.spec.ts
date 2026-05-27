import { test, expect } from "@playwright/test";
// better-sqlite3 hat kein gebundeltes @types-Paket; in dieser einen Test-Datei
// reicht ein lokaler require + Cast, statt eine dev-dep nur fuer einen E2E-Helper
// einzuziehen.
const Database = require("better-sqlite3") as new (path: string) => {
  prepare: (sql: string) => { run: (...args: unknown[]) => unknown };
  close: () => void;
};

test.use({ storageState: "e2e/.auth.json" });

// Update-Banner ist seit dem RSC-Refactor eine Server-Component, die
// `getVersionStatus()` direkt aufruft — Route-Mocks auf /api/version
// greifen nicht mehr. Stattdessen befuellen wir den AppMeta-Cache
// direkt; getVersionStatus liest dann den Cache und ueberspringt den
// GitHub-Call (24h-TTL ist beim frisch geschriebenen Eintrag nie um).

const DB_PATH = (process.env.DATABASE_URL ?? "file:./e2e-test.db").replace(/^file:/, "");

function setLatestVersion(version: string) {
  const db = new Database(DB_PATH);
  try {
    db.prepare(
      `INSERT INTO AppMeta (key, value) VALUES (@key, @value)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run({ key: "latestVersion", value: version });
    db.prepare(
      `INSERT INTO AppMeta (key, value) VALUES (@key, @value)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    ).run({ key: "latestVersionCheckedAt", value: String(Date.now()) });
  } finally {
    db.close();
  }
}

test.describe("Update-Banner", () => {
  test("erscheint bei verfügbarem Update", async ({ page }) => {
    // package.json bei jedem Run aktuell — wir geben einen DEUTLICH hoeheren
    // Wert vor, damit hasNewerVersion garantiert true wird.
    setLatestVersion("99.99.99");
    await page.goto("/rezepte");
    await expect(page.getByText(/Version/).filter({ hasText: "99.99.99" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Update-Anleitung/i })).toBeVisible();
  });

  test("kein Banner ohne Update", async ({ page }) => {
    setLatestVersion("0.0.0");
    await page.goto("/rezepte");
    await expect(page.getByText(/ist verfügbar/i)).toHaveCount(0);
  });
});
