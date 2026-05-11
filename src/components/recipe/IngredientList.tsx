"use client";

import { useState } from "react";
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
};

export function IngredientList({ baseServings, ingredients }: Props) {
  const [servings, setServings] = useState(baseServings);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="font-written text-sm text-ink-faded">für</span>
        <input
          type="number"
          min={1}
          max={99}
          value={servings}
          onChange={(e) => setServings(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
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
