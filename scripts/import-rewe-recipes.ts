/**
 * Bulk-import recipes from rewe.de via Puppeteer (Cloudflare-Bypass).
 *
 * Rewe scattered its Recipe data: title via <h1>, description/image via JSON-LD
 * Webpage block, ingredients via .ingredient_table_row, steps via .step-ingredients.
 *
 * Usage: npx tsx scripts/import-rewe-recipes.ts [count]
 */

import puppeteer, { type Browser } from "puppeteer";
import * as cheerio from "cheerio";
import { prisma } from "@/lib/db/prisma";
import { createRecipe } from "@/lib/recipes/server";
import { recipeInputSchema } from "@/lib/schemas/recipe";

const ENTRY_URL = "https://www.rewe.de/rezepte/";
const TARGET_COUNT = Number(process.argv[2] ?? "15");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

type ParsedRecipe = {
  title: string;
  description: string | null;
  servings: number;
  ingredients: { name: string; amount: number | null; unit: string | null; note: string | null }[];
  instructions: string;
};

async function setupPage(browser: Browser) {
  const page = await browser.newPage();
  await page.setUserAgent(UA);
  await page.setExtraHTTPHeaders({ "Accept-Language": "de-DE,de;q=0.9" });
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    Object.defineProperty(navigator, "languages", { get: () => ["de-DE", "de", "en"] });
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
  });
  return page;
}

async function collectRecipeUrls(browser: Browser, count: number): Promise<string[]> {
  const page = await setupPage(browser);
  await page.goto(ENTRY_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 4_000));
  const urls = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/rezepte/"]'));
    return Array.from(
      new Set(
        anchors
          .map((a) => a.href)
          .filter((h) => /\/rezepte\/[a-z0-9-]+\/?$/i.test(h))
          .map((h) => h.replace(/\/$/, "")),
      ),
    );
  });
  await page.close();
  return urls.slice(0, count);
}

async function fetchHtml(browser: Browser, url: string): Promise<string> {
  const page = await setupPage(browser);
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 3_000));
    return await page.content();
  } finally {
    await page.close();
  }
}

function parseAmountUnit(raw: string): { amount: number | null; unit: string | null } {
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s) return { amount: null, unit: null };
  const m = s.match(/^([\d.,]+(?:\s*\/\s*[\d.,]+)?)\s*(.*)$/);
  if (!m) return { amount: null, unit: s };
  const numStr = m[1];
  const parts = numStr.split("/").map((p) => parseFloat(p.trim().replace(",", ".")));
  const amount =
    parts.length === 2 && parts[1]
      ? parts[0] / parts[1]
      : parseFloat(numStr.replace(",", "."));
  return {
    amount: Number.isFinite(amount) ? amount : null,
    unit: m[2].trim() || null,
  };
}

function parseReweHtml(html: string): ParsedRecipe | null {
  const $ = cheerio.load(html);

  const title = $("h1").first().text().replace(/\s+/g, " ").trim();
  if (!title) return null;

  let description: string | null = null;
  for (const sc of $('script[type="application/ld+json"]').toArray()) {
    try {
      const json: unknown = JSON.parse($(sc).html() ?? "");
      const items = Array.isArray(json)
        ? json
        : (json as Record<string, unknown>)["@graph"]
          ? ((json as Record<string, unknown>)["@graph"] as Record<string, unknown>[])
          : [json as Record<string, unknown>];
      for (const item of items) {
        const t = item["@type"];
        if (t === "Webpage" || t === "WebPage") {
          const d = item["description"];
          if (typeof d === "string" && d.length > 0) {
            description = d;
            break;
          }
        }
      }
      if (description) break;
    } catch {
      // skip
    }
  }

  const ingredients: ParsedRecipe["ingredients"] = [];
  $(".ingredient_table_row").each((_, row) => {
    const cells = $(row).find(".ingredient_table_item");
    if (cells.length < 2) return;
    const amountText = $(cells[0]).text();
    const nameRaw = $(cells[1]).text().replace(/\s+/g, " ").trim();
    if (!nameRaw) return;
    const { amount, unit } = parseAmountUnit(amountText);
    const [namePart, ...noteParts] = nameRaw.split(/[(,]/);
    const note = noteParts.length > 0
      ? noteParts.join(",").replace(/\)$/, "").replace(/^[ ,]+/, "").trim() || null
      : null;
    ingredients.push({
      name: namePart.trim(),
      amount,
      unit,
      note,
    });
  });

  const stepTexts: string[] = [];
  $(".step-ingredients").each((_, sec) => {
    const $clone = $(sec).clone();
    $clone.find(".step-ingredients__list").remove();
    $clone.find(".step-ingredients__content-container").remove();
    let text = $clone.text().replace(/\s+/g, " ").trim();
    text = text.replace(/^erledigt\s*/i, "").trim();
    if (text.length > 10) stepTexts.push(text);
  });
  const instructions = stepTexts.map((t, i) => `${i + 1}. ${t}`).join("\n\n");

  if (ingredients.length === 0 || instructions.length < 20) return null;

  const servingsMatch = $("input[name*='portion'], [class*='portion']")
    .first()
    .text()
    .match(/(\d+)/);
  const servings = servingsMatch ? Number(servingsMatch[1]) : 4;

  return {
    title,
    description,
    servings: servings > 0 && servings < 100 ? servings : 4,
    ingredients,
    instructions,
  };
}

function toRecipeInput(parsed: ParsedRecipe, sourceUrl: string) {
  return recipeInputSchema.parse({
    title: parsed.title,
    description: parsed.description ?? null,
    servings: parsed.servings,
    instructions: parsed.instructions,
    sourceUrl,
    sourceType: "WEB",
    categoryIds: [],
    ingredients: parsed.ingredients,
  });
}

async function getOwnerUserId(): Promise<string> {
  const admin = await prisma.user.findUnique({ where: { email: "admin@kochbuch.local" } });
  if (admin) return admin.id;
  const first = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!first) throw new Error("Kein User in der DB. Bitte zuerst 'npm run db:seed' ausführen.");
  return first.id;
}

async function main() {
  console.log(`📚 Rewe-Rezept-Import (Ziel: ${TARGET_COUNT})\n`);

  const userId = await getOwnerUserId();

  console.log(`▶ Sammle URLs von ${ENTRY_URL} …`);
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const urls = await collectRecipeUrls(browser, TARGET_COUNT * 2);
    console.log(`  ${urls.length} URLs gefunden, importiere bis ${TARGET_COUNT}.\n`);

    for (const url of urls) {
      if (imported >= TARGET_COUNT) break;
      const existing = await prisma.recipe.findFirst({ where: { sourceUrl: url } });
      if (existing) {
        console.log(`  ⏭  ${url} (schon importiert: "${existing.title}")`);
        skipped++;
        continue;
      }

      process.stdout.write(`  → ${url}\n     `);
      try {
        const html = await fetchHtml(browser, url);
        const parsed = parseReweHtml(html);
        if (!parsed) {
          console.log("✗ konnte Rezept nicht extrahieren");
          failed++;
          continue;
        }
        const input = toRecipeInput(parsed, url);
        const created = await createRecipe(input, userId);
        console.log(
          `✓ "${created.title}" (${parsed.ingredients.length} Zutaten, ${parsed.instructions.split("\n\n").length} Schritte)`,
        );
        imported++;
      } catch (e) {
        console.log(`✗ Fehler: ${e instanceof Error ? e.message : e}`);
        failed++;
      }
    }
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }

  console.log(`\n────────────────────`);
  console.log(`Importiert:     ${imported}`);
  console.log(`Übersprungen:   ${skipped}`);
  console.log(`Fehlgeschlagen: ${failed}`);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
