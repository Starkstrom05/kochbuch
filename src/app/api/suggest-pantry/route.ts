import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { suggestFromPantry } from "@/lib/ai/ollama";

export const maxDuration = 120;

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

  const body = await req.json().catch(() => null);
  const raw: unknown = body?.ingredients;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "Keine Zutaten angegeben" }, { status: 400 });
  }

  const ingredients = raw
    .split(/[\n,;]+/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "Keine Zutaten erkannt" }, { status: 400 });
  }

  return sseStream(async (send) => {
    send("progress", {
      message: `${ingredients.length} Zutaten erkannt — frage Ollama (kann 30–60 s dauern)…`,
    });
    const suggestions = await suggestFromPantry(ingredients);
    send("result", { suggestions });
  });
}
