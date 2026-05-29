"use client";

import type { ReactNode } from "react";
import { SaveFileButton } from "@/components/common/SaveFileButton";

type Props = {
  recipeId: string;
  baseServings: number;
  /** Dateiname fürs Speichern/Teilen (z. B. "<slug>.pdf"). */
  filename: string;
  className?: string;
  children: ReactNode;
};

/**
 * PDF-Export, der die aktuell gewählte Portionszahl (von IngredientList per
 * ?servings in die URL gespiegelt) beim Klick an die PDF-Route weiterreicht.
 * Nutzt SaveFileButton → Web Share auf iOS/Android, Download auf Desktop
 * (`<a download>` funktioniert auf iOS Safari nicht).
 */
export function PdfLink({ recipeId, baseServings, filename, className, children }: Props) {
  const base = `/api/recipes/${recipeId}/pdf`;

  function urlWithServings(): string {
    try {
      const s = new URLSearchParams(window.location.search).get("servings");
      const n = s ? Number(s) : NaN;
      if (Number.isFinite(n) && n > 0 && n !== baseServings) {
        return `${base}?servings=${Math.round(n)}`;
      }
    } catch {
      /* ignore */
    }
    return base;
  }

  return (
    <SaveFileButton
      url={urlWithServings}
      filename={filename}
      className={className}
      busyLabel="⏳ PDF…"
    >
      {children}
    </SaveFileButton>
  );
}
