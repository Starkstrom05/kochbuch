"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  shareShoppingListAction,
  revokeShoppingListShareAction,
  deleteShoppingListAction,
} from "@/app/(app)/einkaufsliste/share-actions";
import { useOmaConfirm, useOmaAlert } from "@/components/oma/useConfirm";

export type ShareMember = { userId: string; userName: string };
export type CandidateUser = { id: string; name: string; email: string };

type Props = {
  listId: string;
  listName: string;
  accesses: ShareMember[];
  candidateUsers: CandidateUser[];
};

export function ShoppingListShareManager({ listId, listName, accesses, candidateUsers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAccess, setShowAccess] = useState(false);
  const { confirm, dialog: confirmDialog } = useOmaConfirm();
  const { alert, dialog: alertDialog } = useOmaAlert();

  const candidatesFiltered = candidateUsers.filter((u) => !accesses.some((a) => a.userId === u.id));

  function handleShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      await shareShoppingListAction(listId, fd);
      form.reset();
      router.refresh();
    });
  }

  function handleRevoke(userId: string) {
    startTransition(async () => {
      await revokeShoppingListShareAction(listId, userId);
      router.refresh();
    });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "Liste löschen?",
      message: `„${listName}" und alle Einträge werden unwiderruflich gelöscht.`,
      confirmLabel: "Löschen",
      variant: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteShoppingListAction(listId);
      } catch (e) {
        await alert({
          title: "Fehler beim Löschen",
          message: e instanceof Error ? e.message : "Unbekannter Fehler",
        });
      }
    });
  }

  return (
    <div className="border-paper-300 mt-6 border-t pt-3">
      <button
        type="button"
        onClick={() => setShowAccess((v) => !v)}
        className="font-written text-ribbon text-sm underline underline-offset-4"
      >
        {showAccess ? "Freigaben ausblenden" : `Freigaben (${accesses.length})`}
      </button>

      {showAccess && (
        <div className="mt-3 space-y-2">
          {accesses.length === 0 ? (
            <p className="font-written text-ink-faded text-sm">Noch keine Freigaben.</p>
          ) : (
            <ul className="space-y-1">
              {accesses.map((a) => (
                <li
                  key={a.userId}
                  className="font-written text-ink flex items-center justify-between text-sm"
                >
                  <span>{a.userName}</span>
                  <button
                    type="button"
                    onClick={() => handleRevoke(a.userId)}
                    disabled={pending}
                    className="text-ink-faded text-xs hover:text-red-700"
                  >
                    entziehen
                  </button>
                </li>
              ))}
            </ul>
          )}

          {candidatesFiltered.length > 0 && (
            <form onSubmit={handleShare} className="flex items-center gap-2">
              <select
                name="userId"
                defaultValue=""
                className="border-ink-light text-ink font-written flex-1 border-b border-dotted bg-transparent text-sm outline-none"
              >
                <option value="" disabled>
                  Mitglied auswählen
                </option>
                {candidatesFiltered.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={pending}
                className="font-written text-ribbon text-sm underline underline-offset-4 disabled:opacity-50"
              >
                freigeben
              </button>
            </form>
          )}

          <div className="border-paper-300 flex justify-end border-t pt-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={pending}
              className="font-written text-ink-faded text-xs hover:text-red-700"
            >
              Liste löschen
            </button>
          </div>
        </div>
      )}

      {confirmDialog}
      {alertDialog}
    </div>
  );
}
