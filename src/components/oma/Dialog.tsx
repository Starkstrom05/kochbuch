"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  /** ID des Headlines im Dialog (für aria-labelledby) — alternativ `label`. */
  labelledBy?: string;
  /** Statischer Accessible Name, wenn kein Headline-Element existiert. */
  label?: string;
  /** Klassen fuer den inneren Container (Layout/Card-Styles). */
  className?: string;
  /** Backdrop-Klick schließt — Default true. Auf false setzen, wenn der Inhalt
   *  destructive ist (Formular mit ungespeicherten Aenderungen). */
  closeOnBackdrop?: boolean;
  children: ReactNode;
};

/**
 * Barrierearmer Modal-Wrapper für die Oma-Optik:
 *  - role="dialog" + aria-modal="true" + aria-labelledby/aria-label
 *  - Escape-Taste schließt
 *  - Body-Scroll-Lock waehrend offen
 *  - Initial-Focus auf das erste focusbare Element im Dialog
 *  - Focus-Trap: Tab/Shift+Tab zykeln im Dialog
 *  - Backdrop schließt (per default)
 *
 * Bewusst klein gehalten: kein Animation/Transition-Layer, keine
 * Portal-Logik (das fixed/inset/z-50 im Render reicht für unser Layout).
 */
export function OmaDialog({
  open,
  onClose,
  labelledBy,
  label,
  className,
  closeOnBackdrop = true,
  children,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Element merken, das vor dem Öffnen Focus hatte — beim Schließen
    // zuruecksetzen, damit Tastaturnutzer nicht am body landen.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Body-Scroll-Lock — verhindert, dass die Seite hinter dem Modal scrollt.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function focusables(): HTMLElement[] {
      if (!dialog) return [];
      return Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("aria-hidden"));
    }

    // Initial-Focus: erstes focusable Element, sonst Dialog-Wrapper selbst.
    const initial = focusables()[0] ?? dialog;
    initial.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
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
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="bg-ink/40 px-safe pb-safe pt-safe fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      // Backdrop-Klick schließt (redundant zu Escape + Focus-Trap). KEIN
      // aria-hidden hier: das Attribut würde auch das role="dialog"-Kind aus
      // dem Accessibility-Tree nehmen — der Dialog wäre für Screenreader unsichtbar.
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
        // Default: nie höher als der (dynamische) Viewport, Inhalt scrollt intern.
        // Verhindert, dass bei langem Inhalt oder eingeblendeter iOS-Tastatur die
        // unteren Buttons aus dem Bild rutschen. dvh statt vh berücksichtigt die
        // Tastatur. Aufrufer-Klassen können es überschreiben.
        className={`max-h-[90dvh] overflow-y-auto ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
