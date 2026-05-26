"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCookbookAction,
  deleteCookbookAction,
  renameCookbookAction,
  revokeCookbookShareAction,
  shareCookbookAction,
  updateCookbookBrandingAction,
} from "@/app/(app)/cookbook-actions";

export type ManagedCookbook = {
  id: string;
  name: string;
  isOwn: boolean;
  ownerName: string;
  accentColor: string | null;
  inkColor: string | null;
  paperColor: string | null;
  accesses: { userId: string; userName: string }[];
};

export type CandidateUser = {
  id: string;
  name: string;
  email: string;
};

type Props = {
  cookbooks: ManagedCookbook[];
  ownCount: number;
  candidateUsers: CandidateUser[];
};

const DEFAULTS = { accent: "#a23e2e", ink: "#2c2418", paper: "#fbf6e9" };

function ColorInput({ name, label, value }: { name: string; label: string; value: string }) {
  return (
    <label className="font-written text-ink-faded flex flex-col items-center gap-1 text-xs">
      {label}
      <input
        type="color"
        name={name}
        defaultValue={value}
        className="border-paper-300 h-10 w-12 cursor-pointer rounded-sm border bg-transparent"
      />
    </label>
  );
}

function CookbookCard({
  cookbook,
  ownCount,
  candidateUsers,
}: {
  cookbook: ManagedCookbook;
  ownCount: number;
  candidateUsers: CandidateUser[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [custom, setCustom] = useState(
    Boolean(cookbook.accentColor || cookbook.inkColor || cookbook.paperColor),
  );
  const [showAccess, setShowAccess] = useState(false);

  function handleRename(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await renameCookbookAction(cookbook.id, fd);
      router.refresh();
    });
  }

  function handleBranding(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await updateCookbookBrandingAction(cookbook.id, fd);
      router.refresh();
    });
  }

  function handleShare(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await shareCookbookAction(cookbook.id, fd);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  function handleRevoke(userId: string) {
    startTransition(async () => {
      await revokeCookbookShareAction(cookbook.id, userId);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Kochbuch "${cookbook.name}" und alle enthaltenen Rezepte loeschen?`)) return;
    startTransition(async () => {
      try {
        await deleteCookbookAction(cookbook.id);
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Fehler beim Loeschen");
      }
    });
  }

  const candidatesFiltered = candidateUsers.filter(
    (u) => !cookbook.accesses.some((a) => a.userId === u.id),
  );

  const canDelete = cookbook.isOwn && ownCount > 1;

  return (
    <div className="paper-card space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <form onSubmit={handleRename} className="flex flex-1 items-center gap-2">
          <input
            name="name"
            defaultValue={cookbook.name}
            maxLength={80}
            className="border-ink-light text-ink font-hand w-full border-b border-dotted bg-transparent text-2xl outline-none"
          />
          <button
            type="submit"
            disabled={pending}
            className="font-written text-ribbon text-xs underline underline-offset-4 disabled:opacity-50"
          >
            speichern
          </button>
        </form>
        {!cookbook.isOwn ? (
          <span className="bg-paper-200 font-written text-ink-faded rounded-sm px-2 py-0.5 text-xs">
            von {cookbook.ownerName}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleBranding} className="space-y-3">
        <label className="font-written text-ink flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="customColors"
            checked={custom}
            onChange={(e) => setCustom(e.target.checked)}
            className="accent-ribbon"
          />
          Eigene Farben fuer dieses Buch
        </label>
        {custom ? (
          <div className="flex flex-wrap gap-4">
            <ColorInput
              name="accentColor"
              label="Akzent"
              value={cookbook.accentColor ?? DEFAULTS.accent}
            />
            <ColorInput name="inkColor" label="Text" value={cookbook.inkColor ?? DEFAULTS.ink} />
            <ColorInput
              name="paperColor"
              label="Papier"
              value={cookbook.paperColor ?? DEFAULTS.paper}
            />
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-3 py-1 text-sm disabled:opacity-50"
        >
          Branding speichern
        </button>
      </form>

      <div className="border-paper-300 border-t pt-3">
        <button
          type="button"
          onClick={() => setShowAccess((v) => !v)}
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          {showAccess ? "Freigaben ausblenden" : `Freigaben (${cookbook.accesses.length})`}
        </button>

        {showAccess ? (
          <div className="mt-3 space-y-2">
            {cookbook.accesses.length === 0 ? (
              <p className="font-written text-ink-faded text-sm">Noch keine Freigaben.</p>
            ) : (
              <ul className="space-y-1">
                {cookbook.accesses.map((a) => (
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

            {candidatesFiltered.length > 0 ? (
              <form onSubmit={handleShare} className="flex items-center gap-2">
                <select
                  name="userId"
                  defaultValue=""
                  className="border-ink-light text-ink font-written flex-1 border-b border-dotted bg-transparent text-sm outline-none"
                >
                  <option value="" disabled>
                    User auswaehlen
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
            ) : null}
          </div>
        ) : null}
      </div>

      {canDelete ? (
        <div className="border-paper-300 flex justify-end border-t pt-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="font-written text-ink-faded text-xs hover:text-red-700"
          >
            Buch loeschen
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function CookbookManager({ cookbooks, ownCount, candidateUsers }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const own = cookbooks.filter((c) => c.isOwn);
  const shared = cookbooks.filter((c) => !c.isOwn);

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createCookbookAction(fd);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    });
  }

  return (
    <section className="paper-card space-y-5 p-6">
      <div>
        <h2 className="font-hand text-ink ink-text text-3xl">Meine Kochbuecher</h2>
        <p className="font-written text-ink-faded mt-1 text-sm">
          Lege Buecher an, vergib Lesezugriffe oder wechsle zwischen ihnen ueber den Header.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex items-center gap-2">
        <input
          name="name"
          placeholder="Neues Kochbuch (z. B. Backbuch)"
          maxLength={80}
          required
          className="border-ink-light text-ink font-written flex-1 border-b border-dotted bg-transparent outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-3 py-1 text-sm disabled:opacity-50"
        >
          + Anlegen
        </button>
      </form>

      <div className="space-y-4">
        {own.map((cb) => (
          <CookbookCard
            key={cb.id}
            cookbook={cb}
            ownCount={ownCount}
            candidateUsers={candidateUsers}
          />
        ))}
      </div>

      {shared.length > 0 ? (
        <>
          <h3 className="font-hand text-ink text-2xl">Freigegebene Buecher</h3>
          <ul className="space-y-2">
            {shared.map((cb) => (
              <li
                key={cb.id}
                className="bg-paper-100 ring-paper-300 font-written text-ink flex items-center justify-between rounded-sm p-3 text-sm ring-1"
              >
                <span>
                  <span className="font-hand text-lg">{cb.name}</span>
                  <span className="text-ink-faded ml-2 text-xs">von {cb.ownerName}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
