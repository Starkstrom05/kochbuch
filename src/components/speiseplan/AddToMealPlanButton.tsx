"use client";

import { useState, useEffect, useTransition } from "react";
import { addMealEntryAction } from "@/app/(app)/speiseplan/actions";

type DayOption = { index: number; label: string };
type PlanOption = { id: string; name: string; days: DayOption[] };

const MEAL_TYPES = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];

type Props = {
  recipeId: string;
  defaultServings: number;
  plans: PlanOption[];
};

export function AddToMealPlanButton({ recipeId, defaultServings, plans }: Props) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id ?? "");
  const [dayIndex, setDayIndex] = useState(0);
  const [mealType, setMealType] = useState("Mittagessen");
  const [servings, setServings] = useState(defaultServings);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedPlan = plans.find((p) => p.id === planId);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSubmit() {
    startTransition(async () => {
      await addMealEntryAction(planId, recipeId, dayIndex, mealType, servings);
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setDone(false);
      }, 1200);
    });
  }

  if (plans.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-sm bg-paper-200 px-3 py-1 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
      >
        📅 Zum Speiseplan
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 paper-card p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-hand text-2xl text-ink">Zum Speiseplan</h2>
              <button
                onClick={() => setOpen(false)}
                className="font-written text-lg text-ink-faded hover:text-ribbon"
                aria-label="Schließen"
              >
                ✕
              </button>
            </div>

            {done ? (
              <p className="py-4 text-center font-written text-ink">
                ✓ Hinzugefügt!
              </p>
            ) : (
              <div className="space-y-4">
                <label className="block">
                  <span className="font-written text-sm text-ink-faded">Plan</span>
                  <select
                    value={planId}
                    onChange={(e) => { setPlanId(e.target.value); setDayIndex(0); }}
                    className="mt-1 block w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="font-written text-sm text-ink-faded">Tag</span>
                  <select
                    value={dayIndex}
                    onChange={(e) => setDayIndex(Number(e.target.value))}
                    className="mt-1 block w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
                  >
                    {(selectedPlan?.days ?? []).map((d) => (
                      <option key={d.index} value={d.index}>{d.label}</option>
                    ))}
                  </select>
                </label>

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

                <button
                  onClick={handleSubmit}
                  disabled={isPending || !planId}
                  className="w-full rounded-sm bg-ribbon py-2 font-hand text-xl text-paper-50 shadow-card disabled:opacity-50"
                >
                  Hinzufügen
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
