"use client";

import { useState, useTransition } from "react";
import { deleteUserAction } from "./actions";

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
};

type Props = {
  users: AdminUser[];
  currentUserId: string;
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MEMBER: "Familienmitglied",
  CHILD: "Kind",
};

export function UserList({ users, currentUserId }: Props) {
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
              {!isSelf ? (
                <button
                  type="button"
                  onClick={() => handleDelete(u.id, u.name)}
                  disabled={pending}
                  className="shrink-0 font-written text-sm text-ribbon underline underline-offset-4 disabled:opacity-40"
                >
                  löschen
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
