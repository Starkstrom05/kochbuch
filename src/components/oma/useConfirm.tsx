"use client";

import { useCallback, useState, type ReactNode } from "react";
import { OmaDialog } from "./Dialog";

type AlertOpts = {
  title?: string;
  message: string;
  okLabel?: string;
};

type AlertState = AlertOpts & {
  resolve: () => void;
};

/**
 * Promise-basierter Ersatz fuer `window.alert()` im Oma-Theme. Liefert
 * `alert(opts)` + `dialog`-Element. `alert(...)` resolvet, sobald der User
 * den OK-Button drueckt oder das Modal schliesst.
 */
export function useOmaAlert(): {
  alert: (opts: AlertOpts) => Promise<void>;
  dialog: ReactNode;
} {
  const [state, setState] = useState<AlertState | null>(null);

  const alert = useCallback((opts: AlertOpts) => {
    return new Promise<void>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  function settle() {
    if (!state) return;
    state.resolve();
    setState(null);
  }

  const dialog = state ? (
    <OmaDialog
      open
      onClose={settle}
      label={state.title ?? "Hinweis"}
      className="bg-paper-50 ring-paper-300 shadow-card w-full max-w-md space-y-4 rounded-sm p-6 ring-1"
    >
      {state.title ? <h2 className="font-hand text-ink text-3xl">{state.title}</h2> : null}
      <p className="font-written text-ink text-base">{state.message}</p>
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={settle}
          className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-1.5 text-lg"
        >
          {state.okLabel ?? "OK"}
        </button>
      </div>
    </OmaDialog>
  ) : null;

  return { alert, dialog };
}

type ConfirmOpts = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" rendert den OK-Button in Akzent-Rot — fuer Loesch-Bestaetigungen. */
  variant?: "default" | "danger";
};

type ConfirmState = ConfirmOpts & {
  resolve: (ok: boolean) => void;
};

/**
 * Promise-basierter Ersatz fuer `window.confirm()` im Oma-Theme.
 *
 * Gibt eine `confirm(opts)`-Funktion + ein `dialog`-Element zurueck. Das
 * Element muss in der JSX irgendwo gerendert werden (Fragment ist ok), und
 * `confirm(...)` resolvet `true` (User bestaetigt) oder `false` (Abbruch
 * oder Modal weggeklickt).
 *
 * Eine Confirm-Anfrage darf zur Zeit aktiv sein — ein zweites confirm()
 * wuerde das erste resolven, was bewusst nicht passiert: aktuelle
 * Aufrufer haben immer eine pending User-Aktion und kein Fan-out-Pattern.
 */
export function useOmaConfirm(): {
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  dialog: ReactNode;
} {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  function settle(ok: boolean) {
    if (!state) return;
    state.resolve(ok);
    setState(null);
  }

  const dialog = state ? (
    <OmaDialog
      open
      onClose={() => settle(false)}
      label={state.title ?? "Bestätigen"}
      className="bg-paper-50 ring-paper-300 shadow-card w-full max-w-md space-y-4 rounded-sm p-6 ring-1"
    >
      {state.title ? <h2 className="font-hand text-ink text-3xl">{state.title}</h2> : null}
      <p className="font-written text-ink text-base">{state.message}</p>
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => settle(false)}
          className="font-written text-ink-faded hover:text-ribbon text-sm underline underline-offset-4"
        >
          {state.cancelLabel ?? "Abbrechen"}
        </button>
        <button
          type="button"
          onClick={() => settle(true)}
          className={
            state.variant === "danger"
              ? "bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-1.5 text-lg"
              : "bg-paper-200 font-hand text-ink ring-paper-300 rounded-sm px-4 py-1.5 text-lg ring-1"
          }
        >
          {state.confirmLabel ?? "OK"}
        </button>
      </div>
    </OmaDialog>
  ) : null;

  return { confirm, dialog };
}
