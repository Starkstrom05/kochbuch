"use client";

import { useTransition, useState } from "react";
import { updateBrandingAction } from "./actions";

type Branding = {
  name: string;
  accentColor: string | null;
  inkColor: string | null;
  paperColor: string | null;
};

const DEFAULTS = { accent: "#a23e2e", ink: "#2c2418", paper: "#fbf6e9" };

function ColorField({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="flex flex-col items-center gap-1 font-written text-xs text-ink-faded">
      {label}
      <input
        type="color"
        name={name}
        defaultValue={value}
        className="h-10 w-12 cursor-pointer rounded-sm border border-paper-300 bg-transparent"
      />
    </label>
  );
}

export function BrandingForm({ branding }: { branding: Branding }) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [custom, setCustom] = useState(
    Boolean(branding.accentColor || branding.inkColor || branding.paperColor),
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateBrandingAction(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <section className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-3xl text-ink ink-text">Branding</h2>
      <p className="font-written text-sm text-ink-faded">
        Familienname und – optional – eigene Farben für das ganze Buch (gilt für alle
        Mitglieder dieser Familie).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="font-written text-sm text-ink-faded">Familienname</span>
          <input
            name="name"
            defaultValue={branding.name}
            maxLength={80}
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-written text-xl text-ink outline-none"
          />
        </label>

        <label className="flex items-center gap-2 font-written text-sm text-ink">
          <input
            type="checkbox"
            name="customColors"
            checked={custom}
            onChange={(e) => setCustom(e.target.checked)}
            className="accent-ribbon"
          />
          Eigene Farben verwenden
        </label>

        {custom ? (
          <div className="flex flex-wrap gap-4">
            <ColorField name="accentColor" label="Akzent" value={branding.accentColor ?? DEFAULTS.accent} />
            <ColorField name="inkColor" label="Text" value={branding.inkColor ?? DEFAULTS.ink} />
            <ColorField name="paperColor" label="Papier" value={branding.paperColor ?? DEFAULTS.paper} />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-sm bg-ribbon px-4 py-1.5 font-hand text-lg text-paper-50 shadow-card disabled:opacity-50"
        >
          {saved ? "✓ Gespeichert" : "Speichern"}
        </button>
      </form>
    </section>
  );
}
