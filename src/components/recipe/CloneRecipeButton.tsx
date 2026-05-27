"use client";

import { useTransition } from "react";
import { cloneRecipeAction } from "@/app/(app)/cookbook-actions";
import { useOmaAlert } from "@/components/oma/useConfirm";

type Props = {
  recipeId: string;
  targetCookbookName: string;
};

export function CloneRecipeButton({ recipeId, targetCookbookName }: Props) {
  const [pending, startTransition] = useTransition();
  const { alert, dialog } = useOmaAlert();

  function handle() {
    startTransition(async () => {
      try {
        await cloneRecipeAction(recipeId);
      } catch (e) {
        // redirect() wirft eine spezielle Exception, die Next selbst abfaengt;
        // alles andere ist ein echter Fehler.
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("NEXT_REDIRECT")) {
          await alert({ title: "Import fehlgeschlagen", message: msg });
        }
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="bg-ribbon font-hand text-paper-50 shadow-card inline-flex items-center gap-2 rounded-sm px-4 py-2 text-lg disabled:opacity-50"
        title={`In dein Kochbuch "${targetCookbookName}" kopieren`}
      >
        ↘ In mein Kochbuch importieren
      </button>
      {dialog}
    </>
  );
}
