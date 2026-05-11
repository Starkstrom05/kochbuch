import { createWorker } from "tesseract.js";

export async function recognizeText(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker(["deu", "eng"]);
  try {
    const {
      data: { text },
    } = await worker.recognize(imageBuffer);
    return text;
  } finally {
    await worker.terminate();
  }
}
