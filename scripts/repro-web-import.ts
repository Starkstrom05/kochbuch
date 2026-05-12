/**
 * Schneller End-to-End-Test fuer den Web-Import, ohne dev-Server.
 * Faehrt fetchAndParseRecipe gegen eine URL und gibt das AiRecipe-Objekt aus.
 *
 *   npx tsx scripts/repro-web-import.ts \
 *     https://www.chefkoch.de/rezepte/2653581416765706/American-Burger-Sauce.html
 */
import { fetchAndParseRecipe } from "../src/lib/import/web";

const url = process.argv[2];
if (!url) {
  console.error("Usage: tsx scripts/repro-web-import.ts <recipe-url>");
  process.exit(1);
}

async function main() {
  console.log(`Importing: ${url}\n`);
  const t0 = Date.now();
  try {
    const result = await fetchAndParseRecipe(url, (msg) =>
      console.log(`  · ${msg}`),
    );
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nOK nach ${elapsed}s — method: ${result.method}\n`);
    const r = result.recipe;
    console.log(`Titel:       ${r.title}`);
    console.log(`Description: ${r.description.slice(0, 80)}…`);
    console.log(`Servings:    ${r.servings}`);
    console.log(`PrepMin:     ${r.prepTimeMinutes ?? "—"}`);
    console.log(`CookMin:     ${r.cookTimeMinutes ?? "—"}`);
    console.log(`Tags:        ${r.tags.join(", ") || "—"}`);
    console.log(`Bilder (${r.imageUrls.length}):`);
    for (const u of r.imageUrls) console.log(`  - ${u}`);
    console.log(`Zutaten (${r.ingredients.length}):`);
    for (const ing of r.ingredients.slice(0, 5)) {
      console.log(`  - ${ing.amount ?? ""} ${ing.unit ?? ""} ${ing.name}`.trim());
    }
    if (r.ingredients.length > 5) console.log(`  … (+${r.ingredients.length - 5} weitere)`);
    console.log(`Schritte (Auszug):`);
    console.log(r.instructions.split("\n").slice(0, 3).join("\n"));
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.error(`FEHLER nach ${elapsed}s:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
