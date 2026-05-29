"use client";

import { useState } from "react";
import { OmaDialog } from "@/components/oma/Dialog";

type RecipeOption = { id: string; title: string; servings: number };

const MEAL_TYPES = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];

type Props = {
  dayLabel: string;
  allRecipes: RecipeOption[];
  onAdd: (recipeId: string, mealType: string, servings: number) => void;
  onCancel: () => void;
};

export function RecipePicker({ dayLabel, allRecipes, onAdd, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecipeOption | null>(null);
  const [mealType, setMealType] = useState("Mittagessen");
  const [servings, setServings] = useState(4);

  const filtered = query.trim()
    ? allRecipes.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))
    : allRecipes;

  function handleSelect(recipe: RecipeOption) {
    setSelected(recipe);
    setServings(recipe.servings);
  }

  function handleSubmit() {
    if (!selected) return;
    onAdd(selected.id, mealType, servings);
  }

  return (
    <OmaDialog
      open
      onClose={onCancel}
      labelledBy="recipe-picker-title"
      className="paper-card relative w-full max-w-md space-y-4 p-6"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="recipe-picker-title" className="font-hand text-ink text-2xl">
          Rezept hinzufügen
        </h2>
        <span className="font-written text-ink-faded text-sm">{dayLabel}</span>
      </div>

      {!selected ? (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept suchen…"
            className="border-ink-light font-written text-ink placeholder:text-ink-light w-full border-b border-dotted bg-transparent outline-none"
          />
          <ul className="divide-paper-200 max-h-64 divide-y overflow-y-auto">
            {filtered.length === 0 && (
              <li className="font-written text-ink-faded py-3 text-center text-sm">
                Keine Treffer
              </li>
            )}
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => handleSelect(r)}
                  className="font-written text-ink hover:bg-paper-200 w-full rounded-sm px-2 py-2.5 text-left text-sm"
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="space-y-4">
          <p className="font-written text-ink text-base font-semibold">{selected.title}</p>

          <label className="block">
            <span className="font-written text-ink-faded text-sm">Mahlzeit</span>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="border-ink-light font-written text-ink mt-1 block w-full border-b border-dotted bg-transparent outline-none"
            >
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-written text-ink-faded text-sm">Portionen</span>
            <input
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="border-ink-light text-ink mt-1 w-20 border-b border-dotted bg-transparent font-serif outline-none"
            />
          </label>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-5 py-2 text-xl"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => setSelected(null)}
              className="font-written text-ink-faded text-sm underline underline-offset-4"
            >
              zurück
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onCancel}
        className="font-written text-ink-faded hover:text-ribbon absolute top-2 right-2 inline-flex h-11 w-11 items-center justify-center text-lg"
        aria-label="Schließen"
      >
        ✕
      </button>
    </OmaDialog>
  );
}
