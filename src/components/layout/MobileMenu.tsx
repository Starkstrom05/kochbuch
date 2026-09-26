"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  const navRef = useRef<HTMLElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Scroll-Lock, Escape-Close, Initial-Focus, Focus-Trap und Focus-Restore,
  // solange das Off-Canvas-Sheet offen ist. OmaDialog passt hier nicht 1:1
  // (dessen Backdrop-Layout ist zentriert/Bottom-Sheet, dieses Menü ist ein
  // rechtsseitiges Vollhoehen-Drawer) — daher Trap/Restore hier nachgerüstet,
  // gleiches Prinzip wie in src/components/oma/Dialog.tsx.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();

    function focusables(): HTMLElement[] {
      const nav = navRef.current;
      if (!nav) return [];
      return Array.from(
        nav.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Menü öffnen"
        aria-expanded={open}
        className="bg-paper-200 font-hand text-ink ring-paper-300 inline-flex h-11 w-11 items-center justify-center rounded-sm text-2xl ring-1 sm:hidden"
      >
        ☰
      </button>

      {open ? (
        <>
          <div
            className="bg-ink/40 fixed inset-0 z-40 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <nav
            ref={navRef}
            role="dialog"
            aria-modal="true"
            aria-label="Hauptmenü"
            className="paper-card fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col gap-2 overflow-y-auto p-5 sm:hidden"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-hand text-ink text-2xl">Menü</span>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menü schließen"
                className="font-hand text-ink-faded hover:text-ink inline-flex h-11 w-11 items-center justify-center rounded-sm text-2xl"
              >
                ✕
              </button>
            </div>

            <MenuLink href="/einkaufsliste" onClick={() => setOpen(false)}>
              🛒 Einkaufsliste
            </MenuLink>
            <MenuLink href="/vorraete" onClick={() => setOpen(false)}>
              🥦 Vorrat — was kann ich kochen?
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
                  className="bg-paper-200 font-hand text-ribbon ring-paper-300 block w-full rounded-sm px-4 py-3 text-left text-xl ring-1"
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
      className="font-hand text-ink hover:bg-paper-200 block rounded-sm px-4 py-3 text-2xl"
    >
      {children}
    </Link>
  );
}
