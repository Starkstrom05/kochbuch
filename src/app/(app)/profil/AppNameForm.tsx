"use client";

import { useTransition, useState } from "react";
import { updateAppNameAction } from "./actions";

export function AppNameForm({ currentName }: { currentName: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateAppNameAction(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <section className="paper-card p-6 space-y-4">
      <h2 className="font-hand text-3xl text-ink ink-text">App-Name</h2>
      <p className="font-written text-sm text-ink-faded">
        Wird überall im App-Titel, in PDFs und auf der Startseite angezeigt.
      </p>
      <form onSubmit={handleSubmit} className="flex items-end gap-3">
        <label className="flex-1">
          <span className="font-written text-sm text-ink-faded">Name</span>
          <input
            name="appName"
            defaultValue={currentName}
            required
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-written text-xl text-ink outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-sm bg-ribbon px-4 py-1.5 font-hand text-lg text-paper-50 shadow-card disabled:opacity-50"
        >
          {saved ? "✓ Gespeichert" : "Speichern"}
        </button>
      </form>
    </section>
  );
}
