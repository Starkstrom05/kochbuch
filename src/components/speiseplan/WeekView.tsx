"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addMealEntryAction,
  removeMealEntryAction,
  exportToShoppingListAction,
  deleteMealPlanAction,
} from "@/app/(app)/speiseplan/actions";
import { RecipePicker } from "./RecipePicker";

type DayLabel = { short: string; long: string; date: string };

type Entry = {
  id: string;
  dayIndex: number;
  mealType: string;
  servings: number;
  recipe: { id: string; title: string; slug: string; servings: number };
};

type RecipeOption = { id: string; title: string; servings: number };

type Props = {
  planId: string;
  planName: string;
  dayLabels: DayLabel[];
  entries: Entry[];
  allRecipes: RecipeOption[];
};

const MEAL_TYPE_ORDER = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];

export function WeekView({ planId, planName, dayLabels, entries, allRecipes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pickerDay, setPickerDay] = useState<number | null>(null);

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleDayCheck(dayIndex: number) {
    const ids = entries.filter((e) => e.dayIndex === dayIndex).map((e) => e.id);
    const allChecked = ids.length > 0 && ids.every((id) => checkedIds.has(id));
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function handleAdd(dayIndex: number, recipeId: string, mealType: string, servings: number) {
    setPickerDay(null);
    startTransition(async () => {
      await addMealEntryAction(planId, recipeId, dayIndex, mealType, servings);
      router.refresh();
    });
  }

  function handleRemove(entryId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      next.delete(entryId);
      return next;
    });
    startTransition(async () => {
      await removeMealEntryAction(planId, entryId);
      router.refresh();
    });
  }

  function handleExport() {
    startTransition(() =>
      exportToShoppingListAction(planId, planName, Array.from(checkedIds)),
    );
  }

  function handleDelete() {
    if (!confirm(`Plan „${planName}" wirklich löschen?`)) return;
    startTransition(() => deleteMealPlanAction(planId));
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {checkedIds.size > 0 ? (
            <>
              <button
                onClick={handleExport}
                disabled={isPending}
                className="rounded-sm bg-ribbon px-4 py-2 font-hand text-lg text-paper-50 shadow-card hover:opacity-90 disabled:opacity-50"
              >
                🛒 Zur Einkaufsliste ({checkedIds.size})
              </button>
              <button
                onClick={() => setCheckedIds(new Set())}
                className="font-written text-sm text-ink-faded underline underline-offset-4"
              >
                Auswahl aufheben
              </button>
            </>
          ) : (
            <p className="font-written text-sm text-ink-faded">
              Mahlzeiten anhaken → Einkaufsliste erstellen
            </p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="font-written text-sm text-ink-faded hover:text-ribbon"
        >
          Plan löschen
        </button>
      </div>

      {/* Week grid */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[700px] grid-cols-7 gap-2">
          {dayLabels.map((label, dayIndex) => {
            const dayEntries = entries
              .filter((e) => e.dayIndex === dayIndex)
              .sort(
                (a, b) =>
                  MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType),
              );
            const ids = dayEntries.map((e) => e.id);
            const allDayChecked = ids.length > 0 && ids.every((id) => checkedIds.has(id));

            return (
              <div key={dayIndex} className="paper-card flex flex-col gap-2 p-3">
                {/* Day header — click to toggle all entries */}
                <button
                  onClick={() => toggleDayCheck(dayIndex)}
                  disabled={ids.length === 0}
                  className={`text-left ${ids.length === 0 ? "cursor-default" : "hover:opacity-80"}`}
                >
                  <div
                    className={`rounded-sm px-1 py-0.5 transition-colors ${allDayChecked ? "bg-ribbon/20" : ""}`}
                  >
                    <p className="font-hand text-lg text-ink leading-tight">{label.long}</p>
                    <p className="font-written text-xs text-ink-faded">{label.date}</p>
                  </div>
                </button>

                {/* Entries */}
                <ul className="space-y-2">
                  {dayEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className={`rounded-sm p-2 ring-1 transition-colors ${
                        checkedIds.has(entry.id)
                          ? "bg-ribbon/10 ring-ribbon/40"
                          : "bg-paper-50 ring-paper-300"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={checkedIds.has(entry.id)}
                          onChange={() => toggleCheck(entry.id)}
                          className="mt-0.5 accent-ribbon"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="mb-0.5 font-written text-xs leading-none text-ink-faded">
                            {entry.mealType}
                          </p>
                          <a
                            href={`/rezepte/${entry.recipe.slug}`}
                            className="line-clamp-2 font-written text-sm leading-tight text-ink hover:text-ribbon"
                          >
                            {entry.recipe.title}
                          </a>
                          <p className="font-written text-xs text-ink-faded">
                            {entry.servings} Port.
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemove(entry.id)}
                          disabled={isPending}
                          className="flex-shrink-0 font-written text-xs text-ink-faded hover:text-ribbon"
                          aria-label="Entfernen"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Picker or add button */}
                {pickerDay === dayIndex ? (
                  <RecipePicker
                    allRecipes={allRecipes}
                    onAdd={(recipeId, mealType, servings) =>
                      handleAdd(dayIndex, recipeId, mealType, servings)
                    }
                    onCancel={() => setPickerDay(null)}
                  />
                ) : (
                  <button
                    onClick={() => setPickerDay(dayIndex)}
                    className="mt-auto rounded-sm border border-dashed border-paper-400 py-1.5 font-written text-xs text-ink-faded hover:border-ribbon hover:text-ribbon"
                  >
                    + Hinzufügen
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
