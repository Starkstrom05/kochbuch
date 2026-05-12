// Gemeinsamer Mutex fuer alle Puppeteer-Jobs (PDF + Web-Import).
// Auf dem TerraMaster F4-423 (Celeron N5095, 31 GiB RAM, keine GPU) frisst jede
// Chromium-Instanz ~300–500 MB. Wenn PDF-Render und Web-Import gleichzeitig
// laufen, sind das schnell >1 GB + zwei Cores blockiert; der Container kippt.
// Deshalb laufen ALLE Puppeteer-Aufgaben serialisiert.

let queue: Promise<unknown> = Promise.resolve();

export function runOnPuppeteer<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job);
  queue = next.catch(() => undefined);
  return next;
}
