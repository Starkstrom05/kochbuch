"use client";

import { useState, useEffect } from "react";

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

  // Escape-Taste schließt Modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 paper-card p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-hand text-2xl text-ink">Rezept hinzufügen</h2>
          <span className="font-written text-sm text-ink-faded">{dayLabel}</span>
        </div>

        {!selected ? (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rezept suchen…"
              className="w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none placeholder:text-ink-light"
            />
            <ul className="max-h-64 overflow-y-auto divide-y divide-paper-200">
              {filtered.length === 0 && (
                <li className="py-3 font-written text-sm text-ink-faded text-center">
                  Keine Treffer
                </li>
              )}
              {filtered.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => handleSelect(r)}
                    className="w-full px-2 py-2.5 text-left font-written text-sm text-ink hover:bg-paper-200 rounded-sm"
                  >
                    {r.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="space-y-4">
            <p className="font-written text-base font-semibold text-ink">{selected.title}</p>

            <label className="block">
              <span className="font-written text-sm text-ink-faded">Mahlzeit</span>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="mt-1 block w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
              >
                {MEAL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-written text-sm text-ink-faded">Portionen</span>
              <input
                type="number"
                min={1}
                max={20}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className="mt-1 w-20 border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
              />
            </label>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSubmit}
                className="rounded-sm bg-ribbon px-5 py-2 font-hand text-xl text-paper-50 shadow-card"
              >
                Hinzufügen
              </button>
              <button
                onClick={() => setSelected(null)}
                className="font-written text-sm text-ink-faded underline underline-offset-4"
              >
                zurück
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onCancel}
          className="absolute right-4 top-4 font-written text-lg text-ink-faded hover:text-ribbon"
          aria-label="Schließen"
        >
          ✕
        </button>
      </div>
    </>
  );
}
