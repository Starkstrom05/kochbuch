/**
 * Backfill recipe images for recipes that were imported via the Rewe-Massen-Skript
 * (v0.1.7) and have a sourceUrl but no images.
 *
 * Strategie:
 *   1. Recipe.sourceUrl mit Puppeteer öffnen (Cloudflare-fähig)
 *   2. JSON-LD-Blöcke nach image-URL durchsuchen
 *   3. Bild herunterladen, via sharp resizen (cover + thumb), in UPLOAD_DIR
 *   4. RecipeImage-Eintrag anlegen (order 0)
 *
 * Nutzung:
 *   UPLOAD_DIR=./uploads npx tsx scripts/backfill-covers.ts [maxCount]
 *
 * Auf dem NAS (im Container):
 *   docker exec -it kochbuch node /app/node_modules/tsx/dist/cli.mjs \
 *     /app/scripts/backfill-covers.ts
 */

import * as cheerio from "cheerio";
import { prisma } from "@/lib/db/prisma";
import { addImageFromUrl } from "@/lib/recipes/images";
import { withBrowser } from "@/lib/puppeteer/browser";
import { runOnPuppeteer } from "@/lib/puppeteer/queue";

const MAX_COUNT = Number(process.argv[2] ?? "50");

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36";

function extractImageUrl(html: string): string | null {
  const $ = cheerio.load(html);
  for (const sc of $('script[type="application/ld+json"]').toArray()) {
    try {
      const json: unknown = JSON.parse($(sc).html() ?? "");
      const items = Array.isArray(json)
        ? (json as Record<string, unknown>[])
        : (json as Record<string, unknown>)["@graph"]
          ? ((json as Record<string, unknown>)["@graph"] as Record<string, unknown>[])
          : [json as Record<string, unknown>];

      for (const item of items) {
        const url = imageFromLdItem(item);
        if (url) return url;
      }
    } catch {
      // skip
    }
  }
  // Fallback: og:image
  const og = $('meta[property="og:image"]').attr("content");
  return og ?? null;
}

function imageFromLdItem(item: Record<string, unknown>): string | null {
  const img = item.image;
  if (!img) return null;
  if (typeof img === "string") return img;
  if (Array.isArray(img)) {
    for (const candidate of img) {
      if (typeof candidate === "string") return candidate;
      if (candidate && typeof candidate === "object") {
        const url = (candidate as Record<string, unknown>).url;
        if (typeof url === "string") return url;
      }
    }
  }
  if (typeof img === "object" && img !== null) {
    const url = (img as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return null;
}

async function fetchHtmlViaPuppeteer(url: string): Promise<string> {
  return runOnPuppeteer(() =>
    withBrowser(async (browser) => {
      const page = await browser.newPage();
      await page.setUserAgent(UA);
      await page.setExtraHTTPHeaders({ "Accept-Language": "de-DE,de;q=0.9" });
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await new Promise((r) => setTimeout(r, 3_000));
      return await page.content();
    }),
  );
}

async function main() {
  console.log(`Cover-Backfill (max ${MAX_COUNT} Rezepte)\n`);

  const todo = await prisma.recipe.findMany({
    where: {
      images: { none: {} },
      sourceUrl: { not: null },
    },
    select: { id: true, title: true, sourceUrl: true },
    take: MAX_COUNT,
  });

  if (todo.length === 0) {
    console.log("Nichts zu tun — alle Rezepte haben bereits Bilder oder keine sourceUrl.");
    await prisma.$disconnect();
    return;
  }

  console.log(`${todo.length} Rezept(e) ohne Bilder.\n`);

  let ok = 0;
  let failed = 0;

  for (const r of todo) {
    if (!r.sourceUrl) continue;
    process.stdout.write(`→ ${r.title}\n   ${r.sourceUrl}\n   `);
    try {
      const html = await fetchHtmlViaPuppeteer(r.sourceUrl);
      const imageUrl = extractImageUrl(html);
      if (!imageUrl) {
        console.log("✗ kein image-Feld in JSON-LD / og:image");
        failed++;
        continue;
      }
      await addImageFromUrl(r.id, imageUrl, { baseUrl: r.sourceUrl });
      console.log(`✓`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(`\n────────────────────`);
  console.log(`Erfolgreich: ${ok}`);
  console.log(`Fehlgeschlagen: ${failed}`);

  await prisma.$disconnect();
}

void main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
