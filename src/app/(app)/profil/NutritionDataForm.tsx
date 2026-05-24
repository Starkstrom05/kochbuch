"use client";

import { useTransition, useState } from "react";
import { reloadNutritionAction } from "./actions";

export function NutritionDataForm() {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function handle() {
    setMsg(null);
    startTransition(async () => {
      try {
        const { count } = await reloadNutritionAction();
        setMsg(`✓ ${count} Zutaten mit Nährwerten aktualisiert`);
      } catch {
        setMsg("Fehler beim Laden der Nährwert-Tabelle.");
      }
    });
  }

  return (
    <section className="paper-card space-y-3 p-6">
      <h2 className="font-hand text-3xl text-ink ink-text">Nährwert-Daten</h2>
      <p className="font-written text-sm text-ink-faded">
        Lädt die mitgelieferte Nährwert-Tabelle (~50 Standardzutaten) und ergänzt fehlende
        Werte/Dichten. Idempotent — bei Bestands-Installationen einmal ausführen, damit die
        Auto-Schätzung greift.
      </p>
      <button
        onClick={handle}
        disabled={isPending}
        className="rounded-sm bg-paper-200 px-4 py-1.5 font-hand text-lg text-ink ring-1 ring-paper-300 hover:bg-paper-300/60 disabled:opacity-50"
      >
        {isPending ? "Lädt…" : "Nährwert-Tabelle laden/aktualisieren"}
      </button>
      {msg ? <p className="font-written text-sm text-ink-faded">{msg}</p> : null}
    </section>
  );
}
