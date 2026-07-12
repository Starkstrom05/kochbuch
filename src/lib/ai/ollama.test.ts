import { describe, it, expect, vi, afterEach } from "vitest";
import { extractJson, aiRecipeSchema, structureRecipeFromText } from "./ollama";

describe("extractJson", () => {
  it("returns the body of a ```json``` fence", () => {
    const input = '```json\n{"title": "Test"}\n```';
    expect(extractJson(input)).toBe('{"title": "Test"}');
  });

  it("returns the body of an unlabelled ``` fence", () => {
    const input = '```\n{"a": 1}\n```';
    expect(extractJson(input)).toBe('{"a": 1}');
  });

  it("slices between first { and last } when no fence is present", () => {
    const input = 'Hier ist dein Rezept: {"title": "Pasta", "servings": 4} — viel Spaß!';
    expect(extractJson(input)).toBe('{"title": "Pasta", "servings": 4}');
  });

  it("handles nested objects inside the slice", () => {
    const input = 'prefix {"a": {"b": 1}, "c": [1, 2]} suffix';
    expect(extractJson(input)).toBe('{"a": {"b": 1}, "c": [1, 2]}');
  });

  it("returns the trimmed input when there is no JSON-like content", () => {
    expect(extractJson("  no json here  ")).toBe("no json here");
  });

  it("prefers a fence over loose braces in the surrounding prose", () => {
    const input = 'Antwort: ```json\n{"x": 1}\n``` aber auch {"y": 2}';
    expect(extractJson(input)).toBe('{"x": 1}');
  });

  it("returns trimmed input when only an opening brace is present", () => {
    const input = "{ unfertig";
    expect(extractJson(input)).toBe("{ unfertig");
  });
});

describe("aiRecipeSchema", () => {
  const minimal = {
    title: "Pfannkuchen",
    ingredients: [{ name: "Mehl", amount: 200, unit: "g" }],
    instructions: "1. Verrühren.\n2. Backen.",
  };

  it("accepts a minimal payload and fills defaults", () => {
    const parsed = aiRecipeSchema.parse(minimal);
    expect(parsed.title).toBe("Pfannkuchen");
    expect(parsed.description).toBe("");
    expect(parsed.servings).toBe(4);
    expect(parsed.tags).toEqual([]);
    expect(parsed.imageUrls).toEqual([]);
  });

  it("coerces stringified servings (LLMs love quoting numbers)", () => {
    const parsed = aiRecipeSchema.parse({ ...minimal, servings: "6" });
    expect(parsed.servings).toBe(6);
  });

  it("coerces stringified ingredient amounts", () => {
    const parsed = aiRecipeSchema.parse({
      ...minimal,
      ingredients: [{ name: "Salz", amount: "0.5", unit: "TL" }],
    });
    expect(parsed.ingredients[0].amount).toBe(0.5);
  });

  it("allows null amounts for unspecified quantities", () => {
    const parsed = aiRecipeSchema.parse({
      ...minimal,
      ingredients: [{ name: "Salz", amount: null, unit: "", note: "nach Geschmack" }],
    });
    expect(parsed.ingredients[0].amount).toBeNull();
  });

  it("rejects an empty ingredient list", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, ingredients: [] })).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, title: "" })).toThrow();
  });

  it("rejects empty instructions", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, instructions: "" })).toThrow();
  });

  it("rejects a title longer than 200 chars", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, title: "x".repeat(201) })).toThrow();
  });

  it("rejects negative ingredient amounts (LLM hallucinations)", () => {
    expect(() =>
      aiRecipeSchema.parse({
        ...minimal,
        ingredients: [{ name: "Salz", amount: -1, unit: "g" }],
      }),
    ).toThrow();
  });
});

// ── structureRecipeFromText: Ollama-Streaming + Retry (gemockter fetch) ──────
//
// ollamaChat() selbst ist nicht exportiert (bewusst — siehe Auftrag: ollama.ts
// nicht aendern). Wir testen den NDJSON-Streaming-Parser und den Retry-Pfad
// daher indirekt ueber die oeffentliche structureRecipeFromText()-Funktion mit
// gemocktem globalThis.fetch.

const VALID_RECIPE_JSON = JSON.stringify({
  title: "Pfannkuchen",
  description: "",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  ingredients: [{ name: "Mehl", amount: 200, unit: "g", note: "" }],
  instructions: "1. Verrühren.\n2. Backen.",
  tags: [],
});

function ndjsonChatResponse(lines: string[], splitMidLine = false): Response {
  const encoder = new TextEncoder();
  const full = lines.map((l) => `${l}\n`).join("");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      if (splitMidLine) {
        // Bewusst NICHT an einer "\n"-Grenze aufteilen — simuliert einen
        // TCP-Chunk, der mitten in einer NDJSON-Zeile endet.
        const mid = Math.floor(full.length / 2);
        controller.enqueue(encoder.encode(full.slice(0, mid)));
        controller.enqueue(encoder.encode(full.slice(mid)));
      } else {
        controller.enqueue(encoder.encode(full));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

function chatLine(content: string, done = false): string {
  return JSON.stringify({ message: { content }, done });
}

function healthResponse(): Response {
  return new Response(null, { status: 200 });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("structureRecipeFromText (NDJSON-Streaming-Parser via gemocktem fetch)", () => {
  it("baut den Content aus mehreren NDJSON-Zeilen zusammen, inkl. done-Frame ohne message", async () => {
    const third = Math.ceil(VALID_RECIPE_JSON.length / 3);
    const part1 = VALID_RECIPE_JSON.slice(0, third);
    const part2 = VALID_RECIPE_JSON.slice(third, third * 2);
    const part3 = VALID_RECIPE_JSON.slice(third * 2);

    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/tags")) return healthResponse();
      if (url.endsWith("/api/chat")) {
        return ndjsonChatResponse([
          chatLine(part1),
          chatLine(part2),
          chatLine(part3),
          JSON.stringify({ done: true }), // done-Frame ohne "message"-Feld
        ]);
      }
      throw new Error(`unerwartete URL im Test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const recipe = await structureRecipeFromText("irgendein Rezepttext");
    expect(recipe.title).toBe("Pfannkuchen");
    expect(recipe.ingredients).toHaveLength(1);
    expect(recipe.instructions).toContain("Verrühren");
  });

  it("verarbeitet einen NDJSON-Chunk, der mitten in einer Zeile geteilt wird", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/tags")) return healthResponse();
      if (url.endsWith("/api/chat")) {
        return ndjsonChatResponse(
          [chatLine(VALID_RECIPE_JSON), JSON.stringify({ done: true })],
          true,
        );
      }
      throw new Error(`unerwartete URL im Test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const recipe = await structureRecipeFromText("irgendein Rezepttext");
    expect(recipe.title).toBe("Pfannkuchen");
  });

  it("ignoriert eine kaputte NDJSON-Zeile, ohne den Rest zu verlieren", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/tags")) return healthResponse();
      if (url.endsWith("/api/chat")) {
        return ndjsonChatResponse([
          chatLine(VALID_RECIPE_JSON.slice(0, 10)),
          "{this is not valid json at all",
          chatLine(VALID_RECIPE_JSON.slice(10)),
          JSON.stringify({ done: true }),
        ]);
      }
      throw new Error(`unerwartete URL im Test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const recipe = await structureRecipeFromText("irgendein Rezepttext");
    expect(recipe.title).toBe("Pfannkuchen");
  });

  it("wiederholt mit verschaerftem Prompt, wenn der erste Versuch kein valides JSON liefert", async () => {
    let chatCalls = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/tags")) return healthResponse();
      if (url.endsWith("/api/chat")) {
        chatCalls++;
        if (chatCalls === 1) {
          // Erster Versuch: Modell antwortet mit Prosa statt JSON.
          return ndjsonChatResponse([
            chatLine("Entschuldigung, das kann ich nicht als JSON liefern."),
            JSON.stringify({ done: true }),
          ]);
        }
        // Zweiter Versuch: Body muss den verschaerften Retry-Prompt enthalten.
        const body = JSON.parse(String(init?.body)) as {
          messages: { role: string; content: string }[];
        };
        expect(body.messages.at(-1)?.content).toContain("WICHTIG");
        return ndjsonChatResponse([chatLine(VALID_RECIPE_JSON), JSON.stringify({ done: true })]);
      }
      throw new Error(`unerwartete URL im Test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const recipe = await structureRecipeFromText("irgendein Rezepttext");
    expect(recipe.title).toBe("Pfannkuchen");
    expect(chatCalls).toBe(2);
  });

  it("wirft nach zwei gescheiterten Versuchen den letzten Fehler", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("/api/tags")) return healthResponse();
      if (url.endsWith("/api/chat")) {
        return ndjsonChatResponse([
          chatLine("immer noch keine gueltige JSON-Antwort"),
          JSON.stringify({ done: true }),
        ]);
      }
      throw new Error(`unerwartete URL im Test: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(structureRecipeFromText("irgendein Rezepttext")).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(3); // 1x health + 2x chat (Erstversuch + Retry)
  });
});
