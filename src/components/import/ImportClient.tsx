"use client";

import { useState, useRef } from "react";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import type { AiRecipe } from "@/lib/ai/ollama";

type Category = { id: string; name: string; icon: string | null };
type Step = "idle" | "importing" | "editing";
type ImportMethod = "json-ld" | "ollama" | "ocr" | null;

type Props = {
  categories: Category[];
  createAction: (formData: FormData) => void | Promise<void>;
};

// ── SSE reader helper ────────────────────────────────────────────────────────

async function readSseStream(
  response: Response,
  onProgress: (msg: string) => void,
  onResult: (data: { recipe: AiRecipe; method: ImportMethod; sourceUrl?: string }) => void,
  onError: (msg: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) { onError("Kein Stream erhalten"); return; }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const lines = block.split("\n");
      let event = "message";
      let dataLine = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        if (line.startsWith("data: ")) dataLine = line.slice(6).trim();
      }
      if (!dataLine) continue;
      try {
        const parsed: unknown = JSON.parse(dataLine);
        if (event === "progress") onProgress((parsed as { message: string }).message);
        if (event === "result") onResult(parsed as { recipe: AiRecipe; method: ImportMethod; sourceUrl?: string });
        if (event === "error") onError((parsed as { message: string }).message);
      } catch { /* skip malformed block */ }
    }
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function ImportClient({ categories, createAction }: Props) {
  const [tab, setTab] = useState<"web" | "ocr">("web");
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState<string[]>([]);
  const [draft, setDraft] = useState<AiRecipe | null>(null);
  const [importMethod, setImportMethod] = useState<ImportMethod>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep("idle");
    setProgress([]);
    setDraft(null);
    setError(null);
    setImportMethod(null);
  }

  async function handleWebImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const url = String(fd.get("url") ?? "").trim();
    if (!url) return;

    setStep("importing");
    setProgress([]);
    setError(null);
    setSourceUrl(url);

    const res = await fetch("/api/import/web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      setStep("idle");
      setError(`Fehler ${res.status}: ${await res.text()}`);
      return;
    }

    await readSseStream(
      res,
      (msg) => setProgress((p) => [...p, msg]),
      ({ recipe, method }) => {
        setDraft(recipe);
        setImportMethod(method ?? "json-ld");
        setStep("editing");
      },
      (msg) => {
        setError(msg);
        setStep("idle");
      },
    );
  }

  async function handleOcrImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    setStep("importing");
    setProgress([]);
    setError(null);

    const fd = new FormData();
    fd.append("image", file);

    const res = await fetch("/api/import/ocr", { method: "POST", body: fd });

    if (!res.ok) {
      setStep("idle");
      setError(`Fehler ${res.status}: ${await res.text()}`);
      return;
    }

    await readSseStream(
      res,
      (msg) => setProgress((p) => [...p, msg]),
      ({ recipe, method }) => {
        setDraft(recipe);
        setImportMethod(method ?? "ocr");
        setStep("editing");
      },
      (msg) => {
        setError(msg);
        setStep("idle");
      },
    );
  }

  // ── Editing step ─────────────────────────────────────────────────────────

  if (step === "editing" && draft) {
    const initial = {
      title: draft.title,
      description: draft.description ?? "",
      servings: draft.servings,
      prepMinutes: draft.prepTimeMinutes ?? null,
      cookMinutes: draft.cookTimeMinutes ?? null,
      difficulty: null,
      instructions: draft.instructions,
      notes: "",
      sourceUrl: importMethod === "json-ld" ? sourceUrl : "",
      sourceType: importMethod === "ocr" ? "OCR" : importMethod === "ollama" ? "AI" : "WEB",
      tags: draft.tags.join(", "),
      categoryIds: [],
      ingredients: draft.ingredients.map((ing) => ({
        name: ing.name,
        amount: ing.amount != null ? String(ing.amount) : "",
        unit: ing.unit ?? "",
        note: ing.note ?? "",
      })),
      imageUrls: draft.imageUrls ?? [],
    };

    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <span className="font-written text-sm text-ink-faded">
            {importMethod === "json-ld"
              ? "Importiert via Schema.org — bitte prüfen und speichern."
              : importMethod === "ocr"
                ? "Per Foto-OCR erfasst — bitte prüfen und korrigieren."
                : "Von KI strukturiert — bitte sorgfältig prüfen."}
          </span>
          <button
            onClick={reset}
            className="font-written text-sm text-ribbon underline underline-offset-4"
          >
            ← neuer Import
          </button>
        </div>
        <RecipeEditor
          action={createAction}
          categories={categories}
          initial={initial}
          submitLabel="Rezept speichern"
        />
      </div>
    );
  }

  // ── Importing step ────────────────────────────────────────────────────────

  if (step === "importing") {
    return (
      <div className="py-20 text-center">
        <p className="font-hand text-4xl text-ink animate-pulse">Mery denkt nach…</p>
        <ul className="mt-8 space-y-1 font-written text-sm text-ink-faded">
          {progress.map((msg, i) => (
            <li key={i}>
              {i === progress.length - 1 ? "→ " : "✓ "}
              {msg}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── Idle step ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Tab switch */}
      <div className="flex gap-2 border-b border-paper-300">
        {(["web", "ocr"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); }}
            className={`px-4 py-2 font-hand text-xl transition-colors ${
              tab === t
                ? "border-b-2 border-ribbon text-ink"
                : "text-ink-faded hover:text-ink"
            }`}
          >
            {t === "web" ? "🌐 Web-URL" : "📷 Foto / OCR"}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-sm bg-red-50 px-4 py-3 font-written text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {tab === "web" && (
        <form onSubmit={handleWebImport} className="space-y-4">
          <label className="block">
            <span className="font-written text-sm text-ink-faded">Rezept-URL</span>
            <input
              name="url"
              type="url"
              required
              placeholder="https://www.chefkoch.de/rezepte/..."
              className="mt-1 w-full rounded-sm border border-paper-300 bg-paper-50 px-3 py-2 font-serif text-ink outline-none focus:border-sepia focus:ring-1 focus:ring-sepia"
            />
          </label>
          <p className="font-written text-xs text-ink-faded">
            Funktioniert gut mit Chefkoch, BBC Good Food, Allrecipes und anderen Seiten mit
            strukturierten Rezeptdaten. Ohne Schema.org fällt der Import auf KI-Analyse zurück
            (dauert länger).
          </p>
          <button
            type="submit"
            className="rounded-sm bg-ribbon px-6 py-2 font-hand text-xl text-paper-50 shadow-sm hover:rotate-[-0.5deg]"
          >
            Rezept importieren
          </button>
        </form>
      )}

      {tab === "ocr" && (
        <form onSubmit={handleOcrImport} className="space-y-4">
          <label className="block">
            <span className="font-written text-sm text-ink-faded">Rezeptfoto</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              required
              className="mt-1 block w-full font-written text-sm text-ink-faded file:mr-4 file:rounded-sm file:border-0 file:bg-ribbon file:px-4 file:py-2 file:font-hand file:text-paper-50"
            />
          </label>
          <p className="font-written text-xs text-ink-faded">
            Druckschrift wird gut erkannt (~5–10 s). Handschrift ist experimentell — tippe
            unklare Stellen danach im Editor nach. Max. 10 MB.
          </p>
          <button
            type="submit"
            className="rounded-sm bg-ribbon px-6 py-2 font-hand text-xl text-paper-50 shadow-sm hover:rotate-[-0.5deg]"
          >
            Foto auswerten
          </button>
        </form>
      )}
    </div>
  );
}
