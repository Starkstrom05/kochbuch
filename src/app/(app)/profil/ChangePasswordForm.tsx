"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initial: ChangePasswordState = { status: "idle" };

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initial);

  return (
    <form action={action} className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-3xl text-ink">Passwort ändern</h2>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">Aktuelles Passwort</span>
        <input
          type="password"
          name="currentPassword"
          autoComplete="current-password"
          required
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">Neues Passwort (min. 8 Zeichen)</span>
        <input
          type="password"
          name="newPassword"
          autoComplete="new-password"
          minLength={8}
          required
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">Neues Passwort wiederholen</span>
        <input
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          minLength={8}
          required
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>

      {state.status === "error" ? (
        <p className="font-written text-sm text-ribbon" role="alert">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-ribbon px-4 py-2 font-hand text-xl text-paper-50 shadow-card hover:rotate-[-0.5deg] disabled:opacity-50"
      >
        {pending ? "Speichere…" : "Passwort ändern"}
      </button>

      <p className="font-written text-xs text-ink-faded">
        Nach erfolgreicher Änderung wirst du abgemeldet und musst dich neu anmelden.
      </p>
    </form>
  );
}
