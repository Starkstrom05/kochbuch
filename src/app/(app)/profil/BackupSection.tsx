"use client";

import { useState } from "react";

type Summary = { imported: number; skipped: number; images: number; errors: string[] };

export function BackupSection() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Bitte eine Backup-ZIP wählen.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/backup/import", { method: "POST", body: fd });
      const json = (await res.json()) as Summary & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Import fehlgeschlagen");
      } else {
        setResult(json);
        form.reset();
      }
    } catch {
      setError("Import fehlgeschlagen (Netzwerkfehler).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-3xl text-ink ink-text">Backup</h2>
      <p className="font-written text-sm text-ink-faded">
        Alle Rezepte inkl. Bilder als ZIP sichern oder wieder einspielen — komplett lokal,
        unabhängig vom NAS-Snapshot.
      </p>

      <div>
        <a
          href="/api/backup/export"
          className="inline-block rounded-sm bg-ribbon px-4 py-1.5 font-hand text-lg text-paper-50 shadow-card"
        >
          ⬇ Backup herunterladen (.zip)
        </a>
      </div>

      <form
        onSubmit={handleImport}
        className="space-y-3 border-t border-dotted border-ink-light/40 pt-4"
      >
        <h3 className="font-hand text-xl text-ink">Backup einspielen</h3>
        <input
          type="file"
          name="file"
          accept=".zip,application/zip"
          className="block w-full font-written text-sm text-ink file:mr-3 file:rounded-sm file:border-0 file:bg-paper-200 file:px-3 file:py-1.5 file:font-hand file:text-ink"
        />
        <fieldset className="flex flex-wrap gap-4 font-written text-sm text-ink">
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="mode" value="skip" defaultChecked className="accent-ribbon" />
            Vorhandene überspringen
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" name="mode" value="duplicate" className="accent-ribbon" />
            Alle importieren (Duplikate möglich)
          </label>
        </fieldset>
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-paper-200 px-4 py-1.5 font-hand text-lg text-ink ring-1 ring-paper-300 hover:bg-paper-300/60 disabled:opacity-50"
        >
          {busy ? "Importiere…" : "Importieren"}
        </button>

        {error ? <p className="font-written text-sm text-ribbon">{error}</p> : null}
        {result ? (
          <div className="font-written text-sm text-ink-faded">
            <p>
              ✓ {result.imported} importiert · {result.skipped} übersprungen · {result.images} Bilder
            </p>
            {result.errors.length > 0 ? (
              <details className="mt-1">
                <summary className="cursor-pointer text-ribbon">
                  {result.errors.length} Hinweis(e)
                </summary>
                <ul className="mt-1 list-disc pl-5">
                  {result.errors.slice(0, 20).map((er, i) => (
                    <li key={i}>{er}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </form>
    </section>
  );
}
