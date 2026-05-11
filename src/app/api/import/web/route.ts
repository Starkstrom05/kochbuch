import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { fetchAndParseRecipe } from "@/lib/import/web";
import { sseStream } from "@/lib/sse";

export const maxDuration = 120;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const url: unknown = body?.url;
  if (typeof url !== "string" || !url.startsWith("http")) {
    return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });
  }

  return sseStream(req, async (send, signal) => {
    const result = await fetchAndParseRecipe(
      url,
      (msg) => send("progress", { message: msg }),
      signal,
    );
    send("result", { recipe: result.recipe, method: result.method, sourceUrl: result.sourceUrl });
  });
}
