"use client";

import { useActionState } from "react";
import { createUserAction, type CreateUserState } from "./actions";

const initial: CreateUserState = { status: "idle" };

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUserAction, initial);

  return (
    <form action={action} className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-ink text-3xl">Neuen Benutzer anlegen</h2>

      <label className="block">
        <span className="font-written text-ink-faded text-sm">Name</span>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-ink-faded text-sm">E-Mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-ink-faded text-sm">Passwort (min. 8 Zeichen)</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-ink-faded text-sm">Rolle</span>
        <select
          name="role"
          defaultValue="MEMBER"
          className="border-ink-light text-ink mt-1 block border-b border-dotted bg-transparent font-serif outline-none"
        >
          <option value="MEMBER">Familienmitglied</option>
          <option value="CHILD">Kind</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>

      {state.status === "error" ? (
        <p className="font-written text-ribbon text-sm" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="font-written text-ink text-sm" role="status">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-4 py-2 text-xl hover:rotate-[-0.5deg] disabled:opacity-50"
      >
        {pending ? "Lege an…" : "Benutzer anlegen"}
      </button>
    </form>
  );
}
