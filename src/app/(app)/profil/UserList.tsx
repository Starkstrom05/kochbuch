"use client";

import { useState, useTransition } from "react";
import { deleteUserAction, assignUserFamilyAction } from "./actions";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  familyId: string | null;
  createdAt: Date;
};

type Props = {
  users: AdminUser[];
  currentUserId: string;
  families: { id: string; name: string }[];
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Familienmitglied",
  CHILD: "Kind",
};

export function UserList({ users, currentUserId, families }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete(id: string, name: string) {
    if (!confirm(`„${name}" wirklich löschen?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteUserAction(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      }
    });
  }

  function handleAssign(id: string, familyId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await assignUserFamilyAction(id, familyId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Zuordnung fehlgeschlagen");
      }
    });
  }

  return (
    <section className="paper-card p-6">
      <h2 className="mb-4 font-hand text-3xl text-ink">Familienmitglieder</h2>
      {error ? (
        <p className="mb-3 font-written text-sm text-ribbon" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-y divide-paper-200">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <li key={u.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-written text-lg text-ink">
                  {u.name}
                  {isSelf ? (
                    <span className="ml-2 font-written text-xs text-ink-faded">
                      (du)
                    </span>
                  ) : null}
                </p>
                <p className="truncate font-written text-xs text-ink-faded">
                  {u.email} · {ROLE_LABEL[u.role] ?? u.role}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <select
                  value={u.familyId ?? ""}
                  onChange={(e) => handleAssign(u.id, e.target.value)}
                  disabled={pending}
                  aria-label="Familie zuordnen"
                  className="border-b border-dotted border-ink-light bg-transparent font-written text-xs text-ink outline-none"
                >
                  <option value="">(keine Familie)</option>
                  {families.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                {!isSelf ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(u.id, u.name)}
                    disabled={pending}
                    className="font-written text-sm text-ribbon underline underline-offset-4 disabled:opacity-40"
                  >
                    löschen
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
