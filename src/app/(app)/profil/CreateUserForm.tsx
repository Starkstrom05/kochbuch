"use client";

import { useActionState } from "react";
import { createUserAction, type CreateUserState } from "./actions";

const initial: CreateUserState = { status: "idle" };

export function CreateUserForm({
  families,
}: {
  families: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createUserAction, initial);

  return (
    <form action={action} className="paper-card space-y-4 p-6">
      <h2 className="font-hand text-3xl text-ink">Neuen Benutzer anlegen</h2>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">Name</span>
        <input
          type="text"
          name="name"
          required
          maxLength={80}
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">E-Mail</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="off"
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">
          Passwort (min. 8 Zeichen)
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        />
      </label>

      <label className="block">
        <span className="font-written text-sm text-ink-faded">Rolle</span>
        <select
          name="role"
          defaultValue="MEMBER"
          className="mt-1 block border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
        >
          <option value="MEMBER">Familienmitglied</option>
          <option value="CHILD">Kind</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>

      {families.length > 0 ? (
        <label className="block">
          <span className="font-written text-sm text-ink-faded">Familie</span>
          <select
            name="familyId"
            defaultValue=""
            className="mt-1 block border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
          >
            <option value="">(keine)</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {state.status === "error" ? (
        <p className="font-written text-sm text-ribbon" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p className="font-written text-sm text-ink" role="status">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-sm bg-ribbon px-4 py-2 font-hand text-xl text-paper-50 shadow-card hover:rotate-[-0.5deg] disabled:opacity-50"
      >
        {pending ? "Lege an…" : "Benutzer anlegen"}
      </button>
    </form>
  );
}
