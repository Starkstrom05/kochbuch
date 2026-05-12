// Puppeteer runs Chromium — on a 4-core Celeron N5095 each instance is ~300-500 MB.
// We serialise all Puppeteer-Jobs (PDF + Web-Import) through einen gemeinsamen
// Mutex (siehe @/lib/puppeteer/queue). Browser-Lifecycle (launch vs. connect)
// liegt in @/lib/puppeteer/browser.

import { runOnPuppeteer } from "@/lib/puppeteer/queue";
import { withBrowser } from "@/lib/puppeteer/browser";

function getInternalUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

type RenderOptions = {
  /** Relative path inside the app, e.g. "/print/recipe/<id>" */
  path: string;
  /** Whether the page requires the internal-only auth header */
  internal: boolean;
};

async function renderOne({ path, internal }: RenderOptions): Promise<Buffer> {
  const secret = process.env.AUTH_SECRET;
  if (internal && !secret) {
    throw new Error("AUTH_SECRET nicht gesetzt — interner Print-Aufruf unmöglich");
  }

  return withBrowser(async (browser) => {
    const page = await browser.newPage();
    if (internal && secret) {
      await page.setExtraHTTPHeaders({ "x-internal-token": secret });
    }
    await page.setViewport({ width: 794, height: 1123 }); // A4 @ 96 dpi

    const url = `${getInternalUrl()}${path}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return Buffer.from(pdf);
  });
}

/**
 * Render a PDF, serialized through the shared Puppeteer mutex so we never run
 * two Chromium instances in parallel on the NAS.
 */
export function renderPdf(opts: RenderOptions): Promise<Buffer> {
  return runOnPuppeteer(() => renderOne(opts));
}
