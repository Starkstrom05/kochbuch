"use client";

import { useState } from "react";
import { SaveFileButton } from "@/components/common/SaveFileButton";

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
      <h2 className="font-hand text-ink ink-text text-3xl">Backup</h2>
      <p className="font-written text-ink-faded text-sm">
        Alle Rezepte inkl. Bilder als ZIP sichern oder wieder einspielen — komplett lokal,
        unabhängig vom NAS-Snapshot.
      </p>

      <div>
        <SaveFileButton
          url="/api/backup/export"
          filename="kochbuch-backup.zip"
          busyLabel="⏳ Erstelle Backup…"
          className="bg-ribbon font-hand text-paper-50 shadow-card inline-block rounded-sm px-4 py-1.5 text-lg disabled:opacity-60"
        >
          ⬇ Backup herunterladen (.zip)
        </SaveFileButton>
      </div>

      <form
        onSubmit={handleImport}
        className="border-ink-light/40 space-y-3 border-t border-dotted pt-4"
      >
        <h3 className="font-hand text-ink text-xl">Backup einspielen</h3>
        <input
          type="file"
          name="file"
          accept=".zip,application/zip"
          className="font-written text-ink file:bg-paper-200 file:font-hand file:text-ink block w-full text-sm file:mr-3 file:rounded-sm file:border-0 file:px-3 file:py-1.5"
        />
        <fieldset className="font-written text-ink flex flex-wrap gap-4 text-sm">
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
          className="bg-paper-200 font-hand text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-4 py-1.5 text-lg ring-1 disabled:opacity-50"
        >
          {busy ? "Importiere…" : "Importieren"}
        </button>

        {error ? <p className="font-written text-ribbon text-sm">{error}</p> : null}
        {result ? (
          <div className="font-written text-ink-faded text-sm">
            <p>
              ✓ {result.imported} importiert · {result.skipped} übersprungen · {result.images}{" "}
              Bilder
            </p>
            {result.errors.length > 0 ? (
              <details className="mt-1">
                <summary className="text-ribbon cursor-pointer">
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
