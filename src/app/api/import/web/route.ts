import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { fetchAndParseRecipe } from "@/lib/import/web";

export const maxDuration = 120; // 2 min — NAS CPU is slow

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
  const url: unknown = body?.url;
  if (typeof url !== "string" || !url.startsWith("http")) {
    return NextResponse.json({ error: "Ungültige URL" }, { status: 400 });
  }

  return sseStream(async (send) => {
    const result = await fetchAndParseRecipe(url, (msg) =>
      send("progress", { message: msg }),
    );
    send("result", { recipe: result.recipe, method: result.method, sourceUrl: result.sourceUrl });
  });
}
