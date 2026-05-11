"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HandwritingCanvas } from "@/components/canvas/HandwritingCanvas";

type Props = { recipeId: string; slug: string; hasExisting: boolean };

export function ZeichnenClient({ recipeId, slug, hasExisting }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(
    async (blob: Blob) => {
      setStatus("saving");
      setError(null);
      const fd = new FormData();
      fd.append("image", blob, "handwritten.png");
      const res = await fetch(`/api/recipes/${recipeId}/handwritten`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) {
        setStatus("saved");
        setTimeout(() => router.push(`/rezepte/${slug}`), 600);
      } else {
        setError(await res.text().catch(() => "Fehler beim Speichern"));
        setStatus("idle");
      }
    },
    [recipeId, slug, router],
  );

  if (status === "saved") {
    return (
      <div className="flex h-dvh items-center justify-center bg-paper-50">
        <p className="font-hand text-4xl text-ink">Gespeichert ✓</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-paper-50">
      <header className="flex items-center justify-between bg-paper-100 px-4 py-2 shadow-sm">
        <button
          onClick={() => router.push(`/rezepte/${slug}`)}
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          ← Abbrechen
        </button>
        <h1 className="font-hand text-2xl text-ink">
          {hasExisting ? "Notiz bearbeiten" : "Handschriftliche Notiz"}
        </h1>
        <span className="font-written text-xs text-ink-faded">
          {status === "saving" ? "Speichert…" : ""}
        </span>
      </header>

      {error && (
        <p className="bg-red-50 px-4 py-2 font-written text-sm text-red-700">{error}</p>
      )}

      <div className="flex-1 p-2">
        <HandwritingCanvas onSave={handleSave} className="h-full" />
      </div>
    </div>
  );
}
