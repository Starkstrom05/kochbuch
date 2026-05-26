"use client";

import { useState, useTransition } from "react";
import {
  connectOurGroceriesAction,
  disconnectOurGroceriesAction,
  selectDefaultListAction,
} from "./actions";

type Status =
  | { state: "disconnected" }
  | {
      state: "connected";
      defaultListId: string | null;
      defaultListName: string | null;
      lastSyncAt: Date | null;
    };

type Props = {
  status: Status;
  configured: boolean;
};

export function OurGroceriesSetupForm({ status, configured }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [lists, setLists] = useState<{ id: string; name: string }[] | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleConnect(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await connectOurGroceriesAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLists(res.lists);
    });
  }

  async function handleSelect(formData: FormData) {
    startTransition(async () => {
      await selectDefaultListAction(formData);
      setLists(null);
    });
  }

  async function handleDisconnect() {
    startTransition(async () => {
      await disconnectOurGroceriesAction();
      setLists(null);
    });
  }

  if (!configured) {
    return (
      <div className="paper-card space-y-2 p-6">
        <h2 className="font-hand text-ink text-3xl">OurGroceries</h2>
        <p className="font-written text-ink-faded text-sm">
          Das Modul ist nicht aktiviert. Bitte <code>OURGROCERIES_ENCRYPTION_KEY</code> in der
          Server-Umgebung setzen (generieren mit <code>openssl rand -base64 32</code>) und die App
          neu starten.
        </p>
      </div>
    );
  }

  return (
    <div className="paper-card space-y-4 p-6">
      <header className="space-y-1">
        <h2 className="font-hand text-ink text-3xl">OurGroceries-Brücke</h2>
        <p className="font-written text-ink-faded text-sm">
          Schickt die Einkaufsliste direkt in die OurGroceries-App. Beachte: Item-Namen, Mengen und
          Rezept-Quellen werden an <strong>ourgroceries.com</strong> übertragen — eine externe
          Cloud, nicht das NAS. Nur aktivieren, wenn du das willst.
        </p>
      </header>

      {status.state === "disconnected" ? (
        <form action={handleConnect} className="space-y-4">
          <label className="block">
            <span className="font-written text-ink-faded text-sm">OurGroceries-E-Mail</span>
            <input
              type="email"
              name="username"
              autoComplete="email"
              required
              className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
            />
          </label>
          <label className="block">
            <span className="font-written text-ink-faded text-sm">OurGroceries-Passwort</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
            />
          </label>
          {error ? (
            <p className="font-written text-ribbon text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-2 text-xl hover:rotate-[-0.5deg] disabled:opacity-50"
          >
            {pending ? "Verbinde…" : "Verbinden"}
          </button>
        </form>
      ) : (
        <>
          <p className="font-written text-ink text-sm">
            Verbunden ✓ · Ziel-Liste:{" "}
            <strong>{status.defaultListName ?? status.defaultListId ?? "—"}</strong>
            {status.lastSyncAt ? (
              <span className="text-ink-faded">
                {" "}
                · zuletzt synchronisiert{" "}
                {new Intl.DateTimeFormat("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(status.lastSyncAt))}
              </span>
            ) : null}
          </p>

          {lists ? (
            <form action={handleSelect} className="space-y-3">
              <label className="block">
                <span className="font-written text-ink-faded text-sm">Ziel-Liste wählen</span>
                <select
                  name="listId"
                  defaultValue={status.defaultListId ?? ""}
                  className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={pending}
                className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-2 text-base disabled:opacity-50"
              >
                Speichern
              </button>
            </form>
          ) : null}

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={pending}
            className="border-ribbon font-hand text-ribbon hover:bg-ribbon/10 rounded-sm border px-4 py-2 text-base disabled:opacity-50"
          >
            Trennen
          </button>
        </>
      )}
    </div>
  );
}
