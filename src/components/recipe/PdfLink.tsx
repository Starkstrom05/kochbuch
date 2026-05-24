"use client";

import type { ReactNode } from "react";

type Props = {
  recipeId: string;
  baseServings: number;
  className?: string;
  children: ReactNode;
};

/**
 * PDF-Download-Link, der die aktuell gewählte Portionszahl (von IngredientList
 * per ?servings in die URL gespiegelt) beim Klick an die PDF-Route weiterreicht.
 * Liest die URL erst im Klick-Handler, damit kein Server-Re-Render nötig ist.
 */
export function PdfLink({ recipeId, baseServings, className, children }: Props) {
  const base = `/api/recipes/${recipeId}/pdf`;

  function hrefWithServings(): string {
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
    <a
      href={base}
      download
      onClick={(e) => {
        e.currentTarget.href = hrefWithServings();
      }}
      className={className}
    >
      {children}
    </a>
  );
}
