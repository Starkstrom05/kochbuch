import * as cheerio from "cheerio";
import type { AiRecipe } from "@/lib/ai/ollama";

// ── Duration parsing ─────────────────────────────────────────────────────────

function parseDuration(value: unknown): number | null {
  if (!value) return null;
  const str = String(value);
  const m = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?/i);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const total = h * 60 + min;
  return total > 0 ? total : null;
}

// ── Servings parsing ─────────────────────────────────────────────────────────

function parseServings(value: unknown): number {
  if (!value) return 4;
  const raw = Array.isArray(value) ? value[0] : value;
  const n = parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 1 ? n : 4;
}

// ── Ingredient string parsing ────────────────────────────────────────────────

const UNITS =
  "ml|cl|dl|l|mg|g|kg|EL|TL|Tl|Pkg\\.?|Pkt\\.?|Bund|Bd\\.?|Stk\\.?|Stück|Prise|Msp\\.?|Dose[n]?|Scheibe[n]?|Zehe[n]?";

const ING_RE = new RegExp(
  `^([\\d.,]+(?:\\s*/\\s*[\\d.,]+)?)\\s*(${UNITS})\\s+(.+)$`,
  "i",
);

function parseFraction(s: string): number {
  const parts = s.split("/").map((p) => parseFloat(p.trim().replace(",", ".")));
  if (parts.length === 2 && parts[1]) return parts[0] / parts[1];
  return parseFloat(s.replace(",", "."));
}

function parseIngredientString(raw: string): AiRecipe["ingredients"][number] {
  const s = raw.trim();
  const m = s.match(ING_RE);
  if (m) {
    const amount = parseFraction(m[1]);
    const [namePart, ...noteParts] = m[3].split(",");
    return {
      name: namePart.trim(),
      amount: Number.isFinite(amount) ? amount : null,
      unit: m[2].replace(/\.$/, ""),
      note: noteParts.join(",").trim(),
    };
  }
  const [namePart, ...noteParts] = s.split(",");
  return { name: namePart.trim(), amount: null, unit: "", note: noteParts.join(",").trim() };
}

// ── JSON-LD mapper ───────────────────────────────────────────────────────────

type LdRecipe = Record<string, unknown>;

function mapJsonLdToAiRecipe(ld: LdRecipe): AiRecipe {
  // Instructions
  const rawInstructions = ld.recipeInstructions;
  let instructions = "";
  if (Array.isArray(rawInstructions)) {
    instructions = rawInstructions
      .map((step, i) => {
        const text =
          typeof step === "string"
            ? step
            : (step as Record<string, string>)?.text ?? String(step);
        return `${i + 1}. ${text.trim()}`;
      })
      .join("\n");
  } else if (typeof rawInstructions === "string") {
    instructions = rawInstructions;
  }

  // Ingredients
  const rawIngredients = Array.isArray(ld.recipeIngredient)
    ? (ld.recipeIngredient as string[])
    : [];
  const ingredients = rawIngredients
    .map((s) => parseIngredientString(String(s)))
    .filter((i) => i.name.length > 0);

  // Tags
  const kw = ld.keywords;
  const tags: string[] = Array.isArray(kw)
    ? kw.map(String)
    : typeof kw === "string"
      ? kw
          .split(/[,;]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  return {
    title: String(ld.name ?? "Unbekanntes Rezept"),
    description: String(ld.description ?? ""),
    servings: parseServings(ld.recipeYield),
    prepTimeMinutes: parseDuration(ld.prepTime),
    cookTimeMinutes: parseDuration(ld.cookTime),
    ingredients,
    instructions,
    tags,
  };
}

// ── Main text extractor (for Ollama fallback) ────────────────────────────────

function extractMainText($: ReturnType<typeof cheerio.load>): string {
  $("script, style, nav, footer, header, aside, [class*='cookie'], [class*='banner'], [class*='ad-']").remove();
  return $("body").text().replace(/\s+/g, " ").trim().slice(0, 8000);
}

// ── HTML fetcher ─────────────────────────────────────────────────────────────

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Kochbuch-Import/1.0; +https://github.com/Starkstrom05/kochbuch)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Abrufen von ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export type WebImportResult = {
  recipe: AiRecipe;
  sourceUrl: string;
  method: "json-ld" | "ollama";
};

export function parseRecipeFromHtml(html: string, url: string): WebImportResult | null {
  const $ = cheerio.load(html);
  const ldScripts = $('script[type="application/ld+json"]').toArray();

  for (const el of ldScripts) {
    try {
      const json: unknown = JSON.parse($(el).html() ?? "");
      const candidates: LdRecipe[] = Array.isArray(json)
        ? (json as LdRecipe[])
        : (json as Record<string, unknown>)["@graph"]
          ? ((json as Record<string, unknown[]>)["@graph"] as LdRecipe[])
          : [json as LdRecipe];

      for (const item of candidates) {
        const type = item["@type"];
        const isRecipe =
          type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));
        if (!isRecipe) continue;
        const recipe = mapJsonLdToAiRecipe(item);
        if (recipe.ingredients.length > 0 && recipe.instructions.length > 20) {
          return { recipe, sourceUrl: url, method: "json-ld" };
        }
      }
    } catch {
      // skip invalid JSON-LD block
    }
  }
  return null;
}

export async function fetchAndParseRecipe(
  url: string,
  onProgress?: (msg: string) => void,
): Promise<WebImportResult> {
  onProgress?.("Lade Seite…");
  const html = await fetchHtml(url);

  onProgress?.("Suche nach strukturierten Rezeptdaten…");
  const parsed = parseRecipeFromHtml(html, url);
  if (parsed) return parsed;

  // Ollama fallback
  onProgress?.("Kein Schema gefunden — analysiere mit KI (kann 30–60 s dauern)…");
  const { structureRecipeFromText } = await import("@/lib/ai/ollama");
  const $ = cheerio.load(html);
  const text = extractMainText($);
  const recipe = await structureRecipeFromText(text);
  return { recipe, sourceUrl: url, method: "ollama" };
}
