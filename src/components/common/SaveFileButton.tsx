"use client";

import { useState, type ReactNode } from "react";
import { saveOrShareFile } from "@/lib/client/save-file";

type Props = {
  /** Ziel-URL oder ein Callback, der sie beim Klick berechnet (z. B. mit Query). */
  url: string | (() => string);
  /** Dateiname fürs Speichern/Teilen, inkl. Endung. */
  filename: string;
  className?: string;
  /** Beschriftung während Abruf/Generierung. */
  busyLabel?: ReactNode;
  children: ReactNode;
};

/**
 * Button, der eine Server-Datei mobil-gerecht anbietet (Web Share auf iOS/Android,
 * Download auf Desktop) — siehe `saveOrShareFile`. Ersetzt `<a download>`, das auf
 * iOS Safari nicht funktioniert. Zeigt während der Generierung einen Busy-Zustand,
 * damit langsame PDF-Renderings (Puppeteer) sichtbar laufen.
 */
export function SaveFileButton({ url, filename, className, busyLabel = "⏳ …", children }: Props) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      await saveOrShareFile(typeof url === "function" ? url() : url, filename);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handle} disabled={busy} aria-busy={busy} className={className}>
      {busy ? busyLabel : children}
    </button>
  );
}
