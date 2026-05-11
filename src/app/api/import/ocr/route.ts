import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { recognizeText } from "@/lib/ocr/tesseract";
import { structureRecipeFromText } from "@/lib/ai/ollama";
import { MAX_UPLOAD_BYTES } from "@/lib/images/upload";

export const maxDuration = 180; // 3 min — OCR + Ollama

function sseStream(
  work: (send: (event: string, data: unknown) => void) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };
      try {
        await work(send);
      } catch (err) {
        send("error", {
          message: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

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

  return sseStream(async (send) => {
    send("progress", { message: "Erkenne Text im Bild (Tesseract)…" });
    const text = await recognizeText(buffer);
    if (text.trim().length < 20) {
      throw new Error("Kein lesbarer Text im Bild gefunden. Bitte ein klareres Foto verwenden.");
    }

    send("progress", {
      message: "Text erkannt — strukturiere Rezept mit KI (kann 30–60 s dauern)…",
    });
    const recipe = await structureRecipeFromText(text);
    send("result", { recipe, method: "ocr" });
  });
}
