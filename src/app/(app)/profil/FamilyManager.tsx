"use client";

import { useTransition, useState } from "react";
import { createFamilyAction } from "./actions";

type Family = { id: string; name: string; memberCount: number };

export function FamilyManager({ families }: { families: Family[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        await createFamilyAction(fd);
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Anlegen fehlgeschlagen");
      }
    });
  }

  return (
    <section className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-3xl text-ink ink-text">Familien</h2>
      <p className="font-written text-sm text-ink-faded">
        Mehrere Haushalte teilen sich den gemeinsamen Rezept-Pool, können aber eigene,
        nur-für-die-Familie sichtbare Rezepte haben.
      </p>
      {families.length > 0 ? (
        <ul className="divide-y divide-paper-200">
          {families.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between py-2 font-written text-ink"
            >
              <span>{f.name}</span>
              <span className="font-written text-xs text-ink-faded">
                {f.memberCount} Mitglied{f.memberCount === 1 ? "" : "er"}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <label className="flex-1">
          <span className="font-written text-sm text-ink-faded">Neue Familie</span>
          <input
            name="name"
            required
            maxLength={80}
            placeholder="z. B. Familie Müller"
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-ribbon px-4 py-1.5 font-hand text-lg text-paper-50 shadow-card disabled:opacity-50"
        >
          {pending ? "…" : "Anlegen"}
        </button>
      </form>
      {error ? <p className="font-written text-sm text-ribbon">{error}</p> : null}
    </section>
  );
}
