"use client";

import { useEffect, useState } from "react";
import type { Release } from "@/lib/changelog/parse";
import { compareSemver } from "@/lib/changelog/parse";
import { OmaDialog } from "@/components/oma/Dialog";

const STORAGE_KEY = "kochbuch.lastSeenReleaseNotes";

type Props = {
  /** Die aktuell installierte App-Version (aus package.json). */
  currentVersion: string;
  /** Alle Releases aus CHANGELOG.md, neuestes zuerst. */
  releases: Release[];
};

/**
 * Whats-New-Drawer: zeigt Release-Notes seit der zuletzt vom User gesehenen
 * Version. Oeffnet sich automatisch einmal nach jedem Update; danach nur per
 * Knopf (siehe WhatsNewButton).
 *
 * State liegt nur clientseitig im localStorage, kein DB-Write.
 */
export function WhatsNewDrawer({ currentVersion, releases }: Props) {
  const [isOpen, setOpen] = useState(false);
  const [shown, setShown] = useState<Release[]>([]);

  useEffect(() => {
    const lastSeen =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;

    if (lastSeen === currentVersion) return;

    // Nichts gesehen: nur die neueste Version zeigen, nicht die ganze Historie
    // ueberfluten. Beim manuellen Klick zeigen wir mehr (siehe handleManualOpen).
    const cutoff = lastSeen ?? previousVersion(releases, currentVersion);
    const toShow = releases.filter((r) => r.date !== null && compareSemver(r.version, cutoff) > 0);
    if (toShow.length === 0) {
      // Keine Notes zu zeigen → Stand markieren, damit wir nicht jeden Reload
      // erneut suchen.
      window.localStorage.setItem(STORAGE_KEY, currentVersion);
      return;
    }
    /* eslint-disable react-hooks/set-state-in-effect --
       localStorage ist nur im Browser verfügbar; useState-Lazy-Init wuerde
       serverseitig laufen und keinen Browser-State sehen. */
    setShown(toShow);
    setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentVersion, releases]);

  function handleClose() {
    setOpen(false);
    window.localStorage.setItem(STORAGE_KEY, currentVersion);
  }

  if (!isOpen || shown.length === 0) return null;

  return <WhatsNewDialog releases={shown} onClose={handleClose} />;
}

/**
 * Knopf, mit dem der User die Notes nochmal aufrufen kann. Zeigt alle Releases
 * der aktuellen Major/Minor-Linie (max. 10, damit die Liste nicht ausartet).
 */
export function WhatsNewButton({ currentVersion, releases }: Props) {
  const [open, setOpen] = useState(false);
  const visible = releases.filter((r) => r.date !== null).slice(0, 10);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="paper-card flex w-full items-center justify-between gap-4 p-6 text-left transition hover:rotate-[-0.2deg]"
      >
        <div>
          <h2 className="font-hand text-ink text-3xl">Was ist neu?</h2>
          <p className="font-written text-ink-faded mt-1 text-sm">
            Änderungen der letzten Versionen (aktuell v{currentVersion}).
          </p>
        </div>
        <span aria-hidden className="font-hand text-ribbon text-3xl">
          ↗
        </span>
      </button>
      {open && <WhatsNewDialog releases={visible} onClose={() => setOpen(false)} />}
    </>
  );
}

function WhatsNewDialog({ releases, onClose }: { releases: Release[]; onClose: () => void }) {
  return (
    <OmaDialog
      open
      onClose={onClose}
      labelledBy="whats-new-title"
      className="bg-paper-50 shadow-card ring-paper-300 w-full max-w-2xl rounded-sm p-6 ring-1"
    >
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 id="whats-new-title" className="font-hand text-ink ink-text text-4xl">
          Was ist neu?
        </h2>
        <button
          onClick={onClose}
          className="font-written text-ink-faded hover:text-ribbon -mt-2 -mr-2 inline-flex h-11 w-11 items-center justify-center text-lg"
          aria-label="Schließen"
        >
          ✕
        </button>
      </header>

      <div className="space-y-8">
        {releases.map((release) => (
          <section key={release.version}>
            <h3 className="font-hand text-ink text-2xl">
              v{release.version}
              {release.date ? (
                <span className="font-written text-ink-faded ml-3 text-sm">
                  {formatDate(release.date)}
                </span>
              ) : null}
            </h3>
            <div className="mt-3 space-y-4">
              {release.sections.map((section) => (
                <div key={section.title}>
                  <h4 className="font-hand text-ribbon text-lg">{section.title}</h4>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {section.items.map((item, idx) => (
                      <li key={idx} className="font-written text-ink text-sm">
                        <ReleaseNoteItem text={item} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-2 text-lg"
        >
          Verstanden
        </button>
      </div>
    </OmaDialog>
  );
}

function ReleaseNoteItem({ text }: { text: string }) {
  // Minimaler Inline-Markdown-Support: **bold** und `code`. Bewusst kein
  // generelles HTML/Markdown-Rendering, weil das CHANGELOG.md vertrauenswuerdig
  // ist und ein dependency-freier Pfad reicht.
  const parts: Array<{ kind: "text" | "bold" | "code"; value: string }> = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ kind: "text", value: text.slice(last, m.index) });
    const t = m[0];
    if (t.startsWith("**")) parts.push({ kind: "bold", value: t.slice(2, -2) });
    else parts.push({ kind: "code", value: t.slice(1, -1) });
    last = m.index! + t.length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "bold") return <strong key={i}>{p.value}</strong>;
        if (p.kind === "code")
          return (
            <code key={i} className="bg-paper-200 rounded-sm px-1 py-0.5 text-xs">
              {p.value}
            </code>
          );
        return <span key={i}>{p.value}</span>;
      })}
    </>
  );
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * "Vorherige" Version: bei erstem Aufruf wollen wir dem User die Notes der
 * aktuell installierten Version zeigen, also den naechstkleineren Eintrag aus
 * dem CHANGELOG als Cutoff nehmen. Wenn das die einzige Version ist, leerer
 * Cutoff → alle Notes anzeigen.
 */
function previousVersion(releases: Release[], current: string): string {
  for (const r of releases) {
    if (r.date !== null && compareSemver(r.version, current) < 0) return r.version;
  }
  return "0.0.0";
}
