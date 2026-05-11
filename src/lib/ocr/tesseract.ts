import { createWorker } from "tesseract.js";
import sharp from "sharp";

const OCR_TIMEOUT_MS = 90_000;
const MAX_SIDE = 2000;

export async function recognizeText(
  imageBuffer: Buffer,
  signal?: AbortSignal,
): Promise<string> {
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

  const worker = await createWorker(["deu", "eng"]);
  try {
    const recognition = worker.recognize(prepared);
    const timeoutPromise = new Promise<never>((_, reject) => {
      const onAbort = () => reject(new Error("OCR abgebrochen"));
      signal?.addEventListener("abort", onAbort, { once: true });
      setTimeout(() => reject(new Error("OCR-Zeitüberschreitung")), OCR_TIMEOUT_MS);
    });
    const { data } = (await Promise.race([recognition, timeoutPromise])) as Awaited<
      ReturnType<typeof worker.recognize>
    >;
    return data.text;
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}
