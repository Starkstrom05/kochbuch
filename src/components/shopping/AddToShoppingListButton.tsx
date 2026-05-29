"use client";

import { useState, useTransition } from "react";
import { OmaDialog } from "@/components/oma/Dialog";
import {
  pickDefaultTargetListId,
  shouldShowListPicker,
  type SelectableList,
} from "@/lib/shopping/target";

type Props = {
  /** Zugängliche Listen (eigene + geteilte). Aus `listAccessibleLists`. */
  lists: SelectableList[];
  /** Gebundene Server-Action; `listId` undefined = eigene (ggf. neue) Liste. */
  action: (listId?: string) => Promise<void>;
  /** Button-Beschriftung, z. B. „🛒 Zur Einkaufsliste". */
  label: string;
  /** Styling der Call-Site (Rezept-Detail vs. Vorräte). */
  buttonClassName?: string;
};

/**
 * „→ Einkaufsliste" mit optionalem Ziel-Selektor. Bei ≤1 zugänglichen Liste ein
 * direkter Klick (schreibt in die eigene, ggf. neu angelegte Liste). Ab 2 Listen
 * öffnet sich ein Dialog zur Auswahl — eigene zuerst, geteilte mit Owner-Hinweis.
 * Die Action redirectet anschließend zur Ziel-Liste; daher kein Erfolgs-State.
 */
export function AddToShoppingListButton({ lists, action, label, buttonClassName }: Props) {
  const showPicker = shouldShowListPicker(lists);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(() => pickDefaultTargetListId(lists) ?? "");
  const [isPending, startTransition] = useTransition();

  const cls =
    buttonClassName ??
    "bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1 text-sm ring-1";

  function submit(listId?: string) {
    startTransition(async () => {
      await action(listId);
    });
  }

  if (!showPicker) {
    return (
      <button onClick={() => submit()} disabled={isPending} className={cls}>
        {label}
      </button>
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} disabled={isPending} className={cls}>
        {label}
      </button>

      <OmaDialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="add-shopping-list-title"
        className="paper-card w-full max-w-sm space-y-4 p-6"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="add-shopping-list-title" className="font-hand text-ink text-2xl">
            Zur Einkaufsliste
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="font-written text-ink-faded hover:text-ribbon text-lg"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        <fieldset className="space-y-2">
          <legend className="font-written text-ink-faded text-sm">Ziel-Liste</legend>
          {lists.map((l) => (
            <label key={l.id} className="font-written text-ink flex items-center gap-2 text-base">
              <input
                type="radio"
                name="target-list"
                value={l.id}
                checked={target === l.id}
                onChange={() => setTarget(l.id)}
                className="accent-ribbon"
              />
              <span>
                {l.name}
                {!l.isOwn && (
                  <span className="text-ink-faded text-sm"> (geteilt von {l.ownerName})</span>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        <button
          onClick={() => submit(target)}
          disabled={isPending || !target}
          className="bg-ribbon font-hand text-paper-50 shadow-card w-full rounded-sm py-2 text-xl disabled:opacity-50"
        >
          Hinzufügen
        </button>
      </OmaDialog>
    </>
  );
}
