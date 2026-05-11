/**
 * SSE helper that:
 * - sends progress/result/error events
 * - wires the client-disconnect signal into an AbortController so downstream
 *   work (Ollama, Tesseract, fetch) can stop instead of running to completion.
 */
export function sseStream(
  req: Request,
  work: (
    send: (event: string, data: unknown) => void,
    signal: AbortSignal,
  ) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const ac = new AbortController();
  req.signal.addEventListener("abort", () => ac.abort(), { once: true });

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Client gone; the abort signal will already have fired.
        }
      };
      try {
        await work(send, ac.signal);
      } catch (err) {
        if (!ac.signal.aborted) {
          send("error", {
            message: err instanceof Error ? err.message : "Unbekannter Fehler",
          });
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      }
    },
    cancel() {
      ac.abort();
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
