"use client";

import { useTransition, useState } from "react";
import { createCategoryAction } from "./actions";

type Category = { id: string; name: string; icon: string | null };

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        await createCategoryAction(fd);
        form.reset();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Anlegen fehlgeschlagen");
      }
    });
  }

  return (
    <section className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-3xl text-ink ink-text">Eigene Kategorien</h2>
      <p className="font-written text-sm text-ink-faded">
        Zusätzlich zu den gemeinsamen Kategorien — nur für die eigene Familie sichtbar.
      </p>
      {categories.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="rounded-sm bg-paper-200 px-2 py-0.5 font-written text-sm text-ink"
            >
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-written text-sm text-ink-light">Noch keine eigenen Kategorien.</p>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <label className="w-16">
          <span className="font-written text-sm text-ink-faded">Icon</span>
          <input
            name="icon"
            maxLength={4}
            placeholder="🥗"
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent text-center font-serif text-ink outline-none"
          />
        </label>
        <label className="flex-1">
          <span className="font-written text-sm text-ink-faded">Neue Kategorie</span>
          <input
            name="name"
            required
            maxLength={60}
            placeholder="z. B. Omas Klassiker"
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
