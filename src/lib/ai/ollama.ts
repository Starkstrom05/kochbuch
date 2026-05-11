import { z } from "zod";

const BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "phi3:3.8b-mini-4k-instruct-q4_K_M";
const TIMEOUT_MS = 90_000;

// ── Schemas ─────────────────────────────────────────────────────────────────

export const aiIngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number().positive().nullable().optional(),
  unit: z.string().default(""),
  note: z.string().default(""),
});

export const aiRecipeSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(""),
  servings: z.coerce.number().int().min(1).default(4),
  prepTimeMinutes: z.coerce.number().int().min(0).nullable().optional(),
  cookTimeMinutes: z.coerce.number().int().min(0).nullable().optional(),
  ingredients: z.array(aiIngredientSchema).min(1),
  instructions: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export type AiRecipe = z.infer<typeof aiRecipeSchema>;

// ── Low-level fetch ──────────────────────────────────────────────────────────

async function ollamaChat(messages: { role: string; content: string }[]): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages,
        format: "json",
        stream: false,
        options: { temperature: 0.1, num_ctx: 4096 },
      }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { message?: { content: string } };
    return data.message?.content ?? "";
  } finally {
    clearTimeout(timeout);
  }
}

// phi3 sometimes wraps JSON in markdown code blocks
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

// ── Prompts ──────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "Du bist ein Koch-Assistent. Antworte IMMER mit reinem, validem JSON ohne Markdown-Formatierung.";

const RECIPE_SCHEMA = `{
  "title": "Rezepttitel",
  "description": "Kurze Beschreibung (leer lassen wenn unbekannt)",
  "servings": 4,
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 30,
  "ingredients": [
    {"name": "Mehl", "amount": 200, "unit": "g", "note": ""},
    {"name": "Salz", "amount": null, "unit": "", "note": "nach Geschmack"}
  ],
  "instructions": "1. Schritt\\n2. Schritt\\n3. Schritt",
  "tags": ["vegetarisch", "schnell"]
}`;

function recipeUserPrompt(text: string, retry = false): string {
  const base = `Extrahiere das folgende Rezept als JSON-Objekt. Halte dich exakt an dieses Schema:\n${RECIPE_SCHEMA}\n\nRezepttext:\n${text.slice(0, 6000)}`;
  return retry ? base + "\n\nWICHTIG: Nur reines JSON, KEIN Markdown, KEINE Erklärungen!" : base;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function structureRecipeFromText(rawText: string): Promise<AiRecipe> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const raw = await ollamaChat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: recipeUserPrompt(rawText, attempt > 0) },
      ]);
      const parsed = JSON.parse(extractJson(raw));
      return aiRecipeSchema.parse(parsed);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new Error("Ollama konnte das Rezept nicht strukturieren");
}

export async function suggestFromPantry(
  ingredients: string[],
  onChunk?: (text: string) => void,
): Promise<string[]> {
  const userPrompt = `Ich habe folgende Zutaten vorrätig: ${ingredients.join(", ")}.
Schlage 3–5 Rezepte vor, die ich damit kochen könnte.
Antworte als JSON: {"suggestions": ["Rezept 1", "Rezept 2"]}`;

  try {
    const raw = await ollamaChat([
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);
    onChunk?.(raw);
    const parsed = JSON.parse(extractJson(raw)) as { suggestions?: string[] };
    return Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  } catch {
    return [];
  }
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
