import { createWorker, type Worker } from "tesseract.js";
import sharp from "sharp";

const OCR_TIMEOUT_MS = 90_000;
const MAX_SIDE = 2000;

// Tesseract-Worker laedt Sprachpakete (~10-20 MB fuer deu+eng) und initialisiert
// das WASM-Modul. Auf dem N5095 dauert das mehrere Sekunden pro Request, wenn
// wir ihn jedes Mal neu erstellen. Wir halten genau einen Worker pro Prozess
// und serialisieren `recognize`-Aufrufe ueber einen Mutex — Tesseract.js darf
// einen Worker nicht parallel benutzen.
let workerPromise: Promise<Worker> | null = null;
let mutex: Promise<unknown> = Promise.resolve();

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(["deu", "eng"]).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

async function withWorker<T>(fn: (w: Worker) => Promise<T>): Promise<T> {
  const prev = mutex;
  let release: () => void = () => {};
  mutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev.catch(() => undefined);
  try {
    const worker = await getWorker();
    return await fn(worker);
  } finally {
    release();
  }
}

export async function recognizeText(imageBuffer: Buffer, signal?: AbortSignal): Promise<string> {
  // Pre-resize to avoid memory spikes on huge images (e.g. 12k x 12k)
  let prepared: Buffer;
  try {
    prepared = await sharp(imageBuffer, { failOn: "error" })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .toBuffer();
  } catch {
    throw new Error("Bild konnte nicht gelesen werden");
  }

  return withWorker(async (worker) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let onAbort: (() => void) | null = null;
    const recognition = worker.recognize(prepared);
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("OCR-Zeitüberschreitung")), OCR_TIMEOUT_MS);
      if (signal) {
        onAbort = () => reject(new Error("OCR abgebrochen"));
        signal.addEventListener("abort", onAbort, { once: true });
      }
    });
    try {
      const { data } = (await Promise.race([recognition, timeoutPromise])) as Awaited<
        ReturnType<typeof worker.recognize>
      >;
      return data.text;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (signal && onAbort) signal.removeEventListener("abort", onAbort);
    }
  });
}
