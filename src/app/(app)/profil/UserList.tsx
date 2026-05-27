"use client";

import { useState, useTransition } from "react";
import { deleteUserAction, assignUserFamilyAction } from "./actions";
import { useOmaConfirm } from "@/components/oma/useConfirm";

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
  const { confirm, dialog } = useOmaConfirm();

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: "Benutzer löschen?",
      message: `„${name}" wird unwiderruflich gelöscht.`,
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
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
      <h2 className="font-hand text-ink mb-4 text-3xl">Familienmitglieder</h2>
      {error ? (
        <p className="font-written text-ribbon mb-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="divide-paper-200 divide-y">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <li key={u.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="font-written text-ink text-lg">
                  {u.name}
                  {isSelf ? (
                    <span className="font-written text-ink-faded ml-2 text-xs">(du)</span>
                  ) : null}
                </p>
                <p className="font-written text-ink-faded truncate text-xs">
                  {u.email} · {ROLE_LABEL[u.role] ?? u.role}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <select
                  value={u.familyId ?? ""}
                  onChange={(e) => handleAssign(u.id, e.target.value)}
                  disabled={pending}
                  aria-label="Familie zuordnen"
                  className="border-ink-light font-written text-ink border-b border-dotted bg-transparent text-xs outline-none"
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
                    className="font-written text-ribbon text-sm underline underline-offset-4 disabled:opacity-40"
                  >
                    löschen
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {dialog}
    </section>
  );
}
