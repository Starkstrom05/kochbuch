"use client";

import { useEffect, useState } from "react";
import { renderIngredient, scaleIngredient } from "@/lib/units/scale";

type Ingredient = {
  amount: number | null;
  unit: string | null;
  note: string | null;
  ingredient: { name: string };
};

type Props = {
  baseServings: number;
  ingredients: Ingredient[];
  recipeId: string;
  /** Aus der URL (?servings=) server-seitig vorgelesen; hat Vorrang vor localStorage. */
  initialServings?: number | null;
};

function clampServings(n: number): number {
  return Math.max(1, Math.min(99, Math.round(n)));
}

function storageKey(recipeId: string): string {
  return `kochbuch:servings:${recipeId}`;
}

export function IngredientList({ baseServings, ingredients, recipeId, initialServings }: Props) {
  const [servings, setServings] = useState(
    initialServings != null && initialServings > 0 ? clampServings(initialServings) : baseServings,
  );

  // Stand keine Portion in der URL, gemerkte Portion (localStorage) nach dem
  // Hydrieren anwenden — bewusst per Effect, sonst SSR/Client-Mismatch.
  useEffect(() => {
    if (initialServings != null) return;
    try {
      const stored = window.localStorage.getItem(storageKey(recipeId));
      const n = stored ? Number(stored) : NaN;
      if (Number.isFinite(n) && n > 0 && n !== baseServings) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setServings(clampServings(n));
      }
    } catch {
      /* localStorage nicht verfügbar — ignorieren */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeServings(raw: number) {
    const v = clampServings(raw || 1);
    setServings(v);
    try {
      window.localStorage.setItem(storageKey(recipeId), String(v));
    } catch {
      /* ignore */
    }
    // URL spiegeln → teilbarer Link + Reload liest ?servings server-seitig.
    try {
      const url = new URL(window.location.href);
      if (v === baseServings) url.searchParams.delete("servings");
      else url.searchParams.set("servings", String(v));
      window.history.replaceState(null, "", url.toString());
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-written text-sm text-ink-faded">für</span>
        <input
          type="number"
          min={1}
          max={99}
          value={servings}
          onChange={(e) => changeServings(Number(e.target.value))}
          className="w-16 border-b-2 border-dotted border-ink-light bg-transparent text-center font-hand text-2xl text-ink outline-none"
        />
        <span className="font-written text-sm text-ink-faded">
          Portion{servings === 1 ? "" : "en"}
          {servings !== baseServings ? ` (Basis: ${baseServings})` : ""}
        </span>
      </div>

      <ul className="space-y-1">
        {ingredients.map((ing, i) => {
          const scaled = scaleIngredient(
            {
              amount: ing.amount,
              unit: ing.unit,
              name: ing.ingredient.name,
              note: ing.note,
            },
            baseServings,
            servings,
          );
          return (
            <li
              key={i}
              className="flex items-baseline gap-3 border-b border-dotted border-ink-light/40 py-1 font-written text-lg text-ink"
            >
              {renderIngredient(scaled)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
