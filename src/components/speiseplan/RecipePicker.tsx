"use client";

import { useState } from "react";

type RecipeOption = { id: string; title: string; servings: number };

const MEAL_TYPES = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];

type Props = {
  allRecipes: RecipeOption[];
  onAdd: (recipeId: string, mealType: string, servings: number) => void;
  onCancel: () => void;
};

export function RecipePicker({ allRecipes, onAdd, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RecipeOption | null>(null);
  const [mealType, setMealType] = useState("Mittagessen");
  const [servings, setServings] = useState(4);

  const filtered = query.trim()
    ? allRecipes.filter((r) => r.title.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : allRecipes.slice(0, 8);

  function handleSelect(recipe: RecipeOption) {
    setSelected(recipe);
    setServings(recipe.servings);
  }

  function handleSubmit() {
    if (!selected) return;
    onAdd(selected.id, mealType, servings);
  }

  return (
    <div className="rounded-sm bg-paper-100 p-3 ring-1 ring-paper-300 space-y-2">
      {!selected ? (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept suchen…"
            className="w-full border-b border-dotted border-ink-light bg-transparent font-written text-sm text-ink outline-none placeholder:text-ink-light"
          />
          <ul className="max-h-40 overflow-y-auto space-y-0.5">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => handleSelect(r)}
                  className="w-full rounded-sm px-2 py-1 text-left font-written text-sm text-ink hover:bg-paper-200"
                >
                  {r.title}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="space-y-2">
          <p className="font-written text-sm font-semibold text-ink">{selected.title}</p>

          <label className="block">
            <span className="font-written text-xs text-ink-faded">Mahlzeit</span>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="mt-0.5 block w-full border-b border-dotted border-ink-light bg-transparent font-written text-sm text-ink outline-none"
            >
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="font-written text-xs text-ink-faded">Portionen</span>
            <input
              type="number"
              min={1}
              max={20}
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="mt-0.5 w-16 border-b border-dotted border-ink-light bg-transparent font-serif text-sm text-ink outline-none"
            />
          </label>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSubmit}
              className="rounded-sm bg-ribbon px-3 py-1 font-hand text-base text-paper-50"
            >
              Hinzufügen
            </button>
            <button
              onClick={() => setSelected(null)}
              className="font-written text-xs text-ink-faded"
            >
              zurück
            </button>
          </div>
        </div>
      )}

      <button
        onClick={onCancel}
        className="block font-written text-xs text-ink-faded hover:text-ribbon"
      >
        Abbrechen
      </button>
    </div>
  );
}
