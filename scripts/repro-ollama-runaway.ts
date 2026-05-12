/**
 * Reproduziert den Ollama-Runaway aus v0.1.7:
 * Auf Cloudflare-Müll-Input (kein echtes Rezept) hat phi3 ohne num_predict-Limit
 * zyklisch generiert und den llama-Runner auf 377 % CPU stehen lassen.
 *
 * Nutzung (lokal gegen den NAS-Ollama oder einen lokalen):
 *   OLLAMA_BASE_URL=http://<nas-ip>:11434 \
 *   OLLAMA_MODEL=phi3:3.8b-mini-4k-instruct-q4_K_M \
 *   npx tsx scripts/repro-ollama-runaway.ts
 *
 * Erwartet:
 *   - Vorher (num_predict=-1): Call läuft >5 min, Container-CPU > 300 %
 *   - Nachher (num_predict=2048): Call endet < 90 s, validiertes JSON
 *     oder klares Schema-Failure (das ist OK — Hauptsache kein Runaway).
 *
 * Lass das Skript auf dem NAS via `docker stats kochbuch-ollama --no-stream`
 * parallel beobachten, um die CPU-Last zu prüfen.
 */
import { structureRecipeFromText, OLLAMA_MODEL } from "../src/lib/ai/ollama";

const CLOUDFLARE_GARBAGE = `
Just a moment...
Enable JavaScript and cookies to continue
Checking your browser before accessing the site.
This process is automatic. Your browser will redirect to your requested content shortly.
Please allow up to 5 seconds...
DDoS protection by Cloudflare
Ray ID: 8a3f2c1b9d4e5f6a
`.repeat(20);

async function main() {
  const url = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  console.log(`Modell:   ${OLLAMA_MODEL}`);
  console.log(`Endpoint: ${url}/api/chat`);
  console.log(`Input:    ${CLOUDFLARE_GARBAGE.length} Zeichen Cloudflare-Müll`);
  console.log("Starte Inferenz — beobachte parallel docker stats kochbuch-ollama");

  const t0 = Date.now();
  try {
    const recipe = await structureRecipeFromText(CLOUDFLARE_GARBAGE);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`OK nach ${elapsed}s — Schema validiert: ${recipe.title}`);
  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`FEHLER nach ${elapsed}s: ${msg}`);
    console.log("Das ist OK — Hauptsache der Runner endet wieder.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
