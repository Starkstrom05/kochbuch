// Puppeteer runs Chromium — on a 4-core Celeron N5095 each instance is ~300-500 MB
// and several in parallel will OOM the NAS. We serialize through a mutex so only
// one PDF renders at a time, and guarantee browser.close() in finally.

let queue: Promise<unknown> = Promise.resolve();

function getInternalUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;
  const port = process.env.PORT ?? "3000";
  return `http://localhost:${port}`;
}

type RenderOptions = {
  /** Relative path inside the app, e.g. "/_print/recipe/<id>" */
  path: string;
  /** Whether the page requires the internal-only auth header */
  internal: boolean;
};

async function renderOne({ path, internal }: RenderOptions): Promise<Buffer> {
  const secret = process.env.AUTH_SECRET;
  if (internal && !secret) {
    throw new Error("AUTH_SECRET nicht gesetzt — interner Print-Aufruf unmöglich");
  }

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    headless: true,
    timeout: 30_000,
  });

  try {
    const page = await browser.newPage();
    if (internal && secret) {
      await page.setExtraHTTPHeaders({ "x-internal-token": secret });
    }
    await page.setViewport({ width: 559, height: 794 }); // A5 @ 96 dpi

    const url = `${getInternalUrl()}${path}`;
    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    await page.evaluateHandle("document.fonts.ready");

    const pdf = await page.pdf({
      format: "A5",
      printBackground: true,
      margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Render a PDF, serialized through a global mutex so we never run two browsers
 * in parallel on the NAS.
 */
export async function renderPdf(opts: RenderOptions): Promise<Buffer> {
  const job = queue.then(() => renderOne(opts), () => renderOne(opts));
  queue = job.catch(() => undefined);
  return job;
}
