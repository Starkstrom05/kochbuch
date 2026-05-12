import * as cheerio from "cheerio";
import type { AiRecipe } from "@/lib/ai/ollama";
import { withBrowser } from "@/lib/puppeteer/browser";
import { runOnPuppeteer } from "@/lib/puppeteer/queue";
import { assertPublicUrl } from "./ssrf";

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

// recipeInstructions kann sein:
//   - String ("Schritt 1. Tu dies. Schritt 2. Tu das.")
//   - Array<string>
//   - Array<HowToStep> mit {text|name}
//   - Array<HowToSection> mit {itemListElement: Array<HowToStep>}  ← Chefkoch
// flattenInstructions normalisiert das alles zu einem Array von Strings.
function flattenInstructions(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value] : [];
  if (Array.isArray(value)) return value.flatMap(flattenInstructions);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (obj["@type"] === "HowToSection") {
      return flattenInstructions(obj.itemListElement);
    }
    if (typeof obj.text === "string" && obj.text.trim()) return [obj.text];
    if (typeof obj.name === "string" && obj.name.trim()) return [obj.name];
  }
  return [];
}

// image kann String, Array<String>, ImageObject {url} oder Array davon sein.
// Wir sammeln ALLE gefundenen URLs (mit Deduplizierung), nicht nur die erste.
function extractImageUrls(value: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const visit = (v: unknown) => {
    if (typeof v === "string") {
      const trimmed = v.trim();
      if (trimmed && !seen.has(trimmed)) {
        seen.add(trimmed);
        out.push(trimmed);
      }
      return;
    }
    if (Array.isArray(v)) {
      for (const item of v) visit(item);
      return;
    }
    if (v && typeof v === "object") {
      const url = (v as Record<string, unknown>).url;
      if (typeof url === "string") visit(url);
    }
  };
  visit(value);
  return out;
}

function mapJsonLdToAiRecipe(ld: LdRecipe): AiRecipe {
  // Instructions
  const steps = flattenInstructions(ld.recipeInstructions);
  const instructions = steps.length
    ? steps.map((step, i) => `${i + 1}. ${step.trim()}`).join("\n")
    : typeof ld.recipeInstructions === "string"
      ? ld.recipeInstructions
      : "";

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
    imageUrls: extractImageUrls(ld.image),
  };
}

// ── Errors ───────────────────────────────────────────────────────────────────

export class NoStructuredRecipeError extends Error {
  constructor(url: string) {
    super(
      `Auf ${url} wurden keine strukturierten Rezeptdaten (JSON-LD) gefunden. ` +
        `Bitte das Rezept manuell eintragen oder eine andere Quelle nutzen.`,
    );
    this.name = "NoStructuredRecipeError";
  }
}

// ── HTML fetcher ─────────────────────────────────────────────────────────────

async function fetchHtml(url: string, externalSignal?: AbortSignal): Promise<string> {
  const check = await assertPublicUrl(url);
  if (!check.ok) throw new Error(`URL abgelehnt: ${check.reason}`);

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Kochbuch-Import/1.0; +https://github.com/Starkstrom05/kochbuch)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
      },
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error(`Redirect ohne Location-Header von ${url}`);
      const next = new URL(loc, url).toString();
      // Re-check target (SSRF protection across redirects); cap at 5 hops via depth.
      return fetchHtml(next, externalSignal);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} beim Abrufen von ${url}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", onAbort);
  }
}

// Cloudflare/JS-protected Sites (Chefkoch, Rewe, …) liefern auf einen simplen
// fetch nur eine "Just a moment …"-Wartepage. Puppeteer rendert echtes HTML
// inkl. JSON-LD, kostet aber auf dem NAS ~300–500 MB pro Instanz — deshalb
// laufen alle Puppeteer-Jobs durch denselben Mutex wie der PDF-Renderer.
const PUPPETEER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

async function fetchHtmlViaPuppeteer(
  url: string,
  externalSignal?: AbortSignal,
): Promise<string> {
  const check = await assertPublicUrl(url);
  if (!check.ok) throw new Error(`URL abgelehnt: ${check.reason}`);

  return runOnPuppeteer(async () => {
    if (externalSignal?.aborted) throw new Error("Abgebrochen");
    return withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setUserAgent(PUPPETEER_UA);
      await page.setExtraHTTPHeaders({ "Accept-Language": "de-DE,de;q=0.9" });
      await page.setViewport({ width: 1280, height: 800 });
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "languages", {
          get: () => ["de-DE", "de", "en"],
        });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
      });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      // Cloudflare-Challenge kann ein paar Sekunden brauchen
      await new Promise((r) => setTimeout(r, 3_000));
      return await page.content();
    });
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

export type WebImportResult = {
  recipe: AiRecipe;
  sourceUrl: string;
  method: "json-ld";
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
  signal?: AbortSignal,
): Promise<WebImportResult> {
  onProgress?.("Lade Seite…");
  const html = await fetchHtml(url, signal);

  onProgress?.("Suche nach strukturierten Rezeptdaten…");
  const parsed = parseRecipeFromHtml(html, url);
  if (parsed) return parsed;

  // fetch lieferte kein JSON-LD. Das ist bei Cloudflare/JS-gerenderten Sites
  // (Chefkoch, Rewe, …) der Normalfall — die Wartepage hat kein Schema. Mit
  // Puppeteer noch einmal versuchen, diesmal mit echtem Browser.
  if (signal?.aborted) throw new Error("Abgebrochen");
  onProgress?.("Kein Schema im HTML — rendere Seite mit Browser (Puppeteer)…");
  const rendered = await fetchHtmlViaPuppeteer(url, signal);

  onProgress?.("Suche im gerenderten HTML nach Rezeptdaten…");
  const parsedRendered = parseRecipeFromHtml(rendered, url);
  if (parsedRendered) return parsedRendered;

  // Auch nach JS-Rendering kein JSON-LD: aufgeben. KEIN Ollama-Fallback —
  // siehe NoStructuredRecipeError-Kommentar und P1.1/P1.2.
  throw new NoStructuredRecipeError(url);
}
