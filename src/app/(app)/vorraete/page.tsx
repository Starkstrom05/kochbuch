"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/oma/EmptyState";

type Step = "idle" | "loading" | "done";

async function readSse(
  response: Response,
  onProgress: (msg: string) => void,
  onResult: (suggestions: string[]) => void,
  onError: (msg: string) => void,
) {
  const reader = response.body?.getReader();
  if (!reader) { onError("Kein Stream"); return; }

  const dec = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const blocks = buf.split("\n\n");
    buf = blocks.pop() ?? "";
    for (const block of blocks) {
      let event = "message", dataLine = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        if (line.startsWith("data: ")) dataLine = line.slice(6).trim();
      }
      if (!dataLine) continue;
      try {
        const parsed: unknown = JSON.parse(dataLine);
        if (event === "progress") onProgress((parsed as { message: string }).message);
        if (event === "result") onResult((parsed as { suggestions: string[] }).suggestions);
        if (event === "error") onError((parsed as { message: string }).message);
      } catch { /* skip */ }
    }
  }
}

export default function VorraetePage() {
  const [step, setStep] = useState<Step>("idle");
  const [progress, setProgress] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ingredients = String(fd.get("ingredients") ?? "").trim();
    if (!ingredients) return;

    setStep("loading");
    setError(null);
    setSuggestions([]);
    setProgress(null);

    const res = await fetch("/api/suggest-pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });

    if (!res.ok) {
      setStep("idle");
      setError(`Fehler ${res.status}`);
      return;
    }

    await readSse(
      res,
      (msg) => setProgress(msg),
      (s) => { setSuggestions(s); setStep("done"); },
      (msg) => { setError(msg); setStep("idle"); },
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-hand text-5xl text-ink ink-text">Was kann ich kochen?</h1>
        <Link href="/rezepte" className="font-written text-sm text-ribbon underline underline-offset-4">
          ← Rezepte
        </Link>
      </header>

      {/* Input */}
      {step !== "loading" && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="font-written text-sm text-ink-faded">
              Was liegt im Kühlschrank / in der Speisekammer?
            </span>
            <textarea
              name="ingredients"
              rows={5}
              required
              className="mt-2 w-full rounded-sm border border-paper-300 bg-paper-50 p-3 font-written text-lg text-ink outline-none focus:border-sepia"
              placeholder={"Mehl, Eier, Butter\nMilch\nÄpfel\nZimt"}
            />
          </label>
          <p className="font-written text-xs text-ink-faded">
            Komma- oder zeilengetrennt. Je mehr Zutaten, desto besser die Vorschläge.
          </p>
          <button
            type="submit"
            className="rounded-sm bg-ribbon px-6 py-2 font-hand text-2xl text-paper-50 shadow-sm hover:rotate-[-0.5deg]"
          >
            Rezepte vorschlagen
          </button>
        </form>
      )}

      {/* Loading */}
      {step === "loading" && (
        <div className="py-16 text-center">
          <p className="font-hand text-4xl text-ink animate-pulse">Mery denkt nach…</p>
          {progress && (
            <p className="mt-4 font-written text-sm text-ink-faded">{progress}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-4 rounded-sm bg-red-50 px-4 py-3 font-written text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Results */}
      {step === "done" && suggestions.length > 0 && (
        <div className="mt-8">
          <h2 className="font-hand text-3xl text-ink ink-text">
            {suggestions.length} Vorschläge
          </h2>
          <ul className="mt-4 divide-y divide-paper-200">
            {suggestions.map((title, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-4">
                <span className="font-written text-lg text-ink">{title}</span>
                <Link
                  href={`/rezepte/neu?title=${encodeURIComponent(title)}`}
                  className="flex-shrink-0 rounded-sm bg-ribbon px-3 py-1 font-hand text-base text-paper-50 hover:rotate-[-0.5deg]"
                >
                  Rezept anlegen
                </Link>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setStep("idle")}
            className="mt-6 font-written text-sm text-ribbon underline underline-offset-4"
          >
            ← neue Anfrage
          </button>
        </div>
      )}

      {step === "done" && suggestions.length === 0 && (
        <div className="mt-8">
          <EmptyState
            illustration="pantry"
            title="Keine Vorschläge gefunden."
            description="Versuch's mit anderen oder mehr Zutaten — Mery braucht ein paar mehr Anhaltspunkte."
            action={
              <button
                onClick={() => setStep("idle")}
                className="rounded-sm bg-ribbon px-6 py-2 font-hand text-2xl text-paper-50 shadow-card hover:rotate-[-0.5deg]"
              >
                Nochmal versuchen
              </button>
            }
          />
        </div>
      )}
    </main>
  );
}
