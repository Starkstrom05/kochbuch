import type { Browser } from "puppeteer";

const COMMON_ARGS = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-blink-features=AutomationControlled",
];

/**
 * Run a callback with a Puppeteer Browser, cleaning up afterwards.
 *
 * Wenn `PUPPETEER_WS_URL` gesetzt ist (z. B. ws://browserless:3000), wird ein
 * Sidecar-Browser über WebSocket genutzt und am Ende disconnected — das App-
 * Image braucht dann kein eigenes Chromium mehr. Sonst lokaler Launch wie
 * bisher, gegen `PUPPETEER_EXECUTABLE_PATH` (Docker) oder das gebundelte
 * Chromium von puppeteer.
 *
 * Achtung: Bei Sidecar-Setups NIE browser.close() rufen — das würde den
 * Sidecar-Container in den Restart zwingen.
 */
export async function withBrowser<T>(fn: (browser: Browser) => Promise<T>): Promise<T> {
  const wsUrl = process.env.PUPPETEER_WS_URL;
  const puppeteer = await import("puppeteer");

  const browser: Browser = wsUrl
    ? await puppeteer.default.connect({ browserWSEndpoint: wsUrl })
    : await puppeteer.default.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: COMMON_ARGS,
        headless: true,
        timeout: 30_000,
      });

  try {
    return await fn(browser);
  } finally {
    if (wsUrl) {
      await browser.disconnect();
    } else {
      await browser.close().catch(() => {});
    }
  }
}
