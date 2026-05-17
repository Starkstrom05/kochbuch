"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  bookHref: string | null;
  /** Server Action — wird als action= einer <form> verwendet. */
  signOutAction: () => Promise<void>;
};

// Off-Canvas-Burger für die /rezepte-Header-Toolbar auf iPhone-Breite.
// Auf ≥sm versteckt; auf <sm zeigt es einen Burger-Button, der ein
// Vollbild-Overlay mit den sekundären Aktionen aufklappt.
export function MobileMenu({ bookHref, signOutAction }: Props) {
  const [open, setOpen] = useState(false);

  // Scroll-Lock und Escape-Close, solange das Sheet offen ist.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-sm bg-paper-200 font-hand text-2xl text-ink ring-1 ring-paper-300 sm:hidden"
      >
        ☰
      </button>

      {open ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-ink/40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            aria-label="Hauptmenü"
            className="paper-card fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-2 overflow-y-auto p-5 sm:hidden"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-hand text-2xl text-ink">Menü</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menü schließen"
                className="inline-flex h-9 w-9 items-center justify-center rounded-sm font-hand text-2xl text-ink-faded hover:text-ink"
              >
                ✕
              </button>
            </div>

            <MenuLink href="/einkaufsliste" onClick={() => setOpen(false)}>
              🛒 Einkaufsliste
            </MenuLink>
            <MenuLink href="/rezepte/importieren" onClick={() => setOpen(false)}>
              ↓ Importieren
            </MenuLink>
            {bookHref ? (
              <MenuLink href={bookHref} onClick={() => setOpen(false)}>
                📖 Als Buch lesen
              </MenuLink>
            ) : null}
            <MenuLink href="/speiseplan" onClick={() => setOpen(false)}>
              📅 Speiseplan
            </MenuLink>
            <MenuLink href="/rezepte/archiv" onClick={() => setOpen(false)}>
              🗂 Archiv
            </MenuLink>
            <MenuLink href="/profil" onClick={() => setOpen(false)}>
              👤 Profil
            </MenuLink>

            <div className="mt-auto pt-4">
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="block w-full rounded-sm bg-paper-200 px-4 py-3 text-left font-hand text-xl text-ribbon ring-1 ring-paper-300"
                >
                  Abmelden
                </button>
              </form>
            </div>
          </nav>
        </>
      ) : null}
    </>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-sm px-4 py-3 font-hand text-2xl text-ink hover:bg-paper-200"
    >
      {children}
    </Link>
  );
}
