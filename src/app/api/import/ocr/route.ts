import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { recognizeText } from "@/lib/ocr/tesseract";
import { structureRecipeFromText } from "@/lib/ai/ollama";
import { MAX_UPLOAD_BYTES } from "@/lib/images/upload";
import { sseStream } from "@/lib/sse";

export const maxDuration = 180;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Kein Bild hochgeladen" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Datei zu groß (max 10 MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return sseStream(req, async (send, signal) => {
    send("progress", { message: "Erkenne Text im Bild (Tesseract)…" });
    const text = await recognizeText(buffer, signal);
    if (text.trim().length < 20) {
      throw new Error("Kein lesbarer Text im Bild gefunden. Bitte ein klareres Foto verwenden.");
    }

    send("progress", {
      message: "Text erkannt — strukturiere Rezept mit KI (kann 30–60 s dauern)…",
    });
    let recipe;
    try {
      recipe = await structureRecipeFromText(text, signal);
    } catch (err) {
      // KI-Strukturierung gescheitert (Ollama down, Timeout, Zod-Fehler …) —
      // Regel 5 aus CLAUDE.md: Fallback = Roh-Text-Editor statt Datenverlust.
      // Bei Client-Abbruch (Navigation weg) lohnt sich das Fallback-Event nicht.
      if (signal.aborted) throw err;
      send("result", { rawText: text, method: "ocr-raw" });
      return;
    }
    send("result", { recipe, method: "ocr" });
  });
}
