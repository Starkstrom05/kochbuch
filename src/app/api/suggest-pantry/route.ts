import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { suggestFromPantry } from "@/lib/ai/ollama";
import { sseStream } from "@/lib/sse";

export const maxDuration = 120;

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

  return sseStream(req, async (send, signal) => {
    send("progress", {
      message: `${ingredients.length} Zutaten erkannt — frage Ollama (kann 30–60 s dauern)…`,
    });
    const suggestions = await suggestFromPantry(ingredients, undefined, signal);
    send("result", { suggestions });
  });
}
