"use client";

import { useState, useTransition } from "react";
import { addMealEntryAction } from "@/app/(app)/speiseplan/actions";
import { OmaDialog } from "@/components/oma/Dialog";

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
        className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1 text-sm ring-1"
      >
        📅 Zum Speiseplan
      </button>

      <OmaDialog
        open={open}
        onClose={() => setOpen(false)}
        labelledBy="add-meal-plan-title"
        className="paper-card w-full max-w-sm space-y-4 p-6"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="add-meal-plan-title" className="font-hand text-ink text-2xl">
            Zum Speiseplan
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="font-written text-ink-faded hover:text-ribbon -mt-2 -mr-2 inline-flex h-11 w-11 items-center justify-center text-lg"
            aria-label="Schließen"
          >
            ✕
          </button>
        </div>

        {done ? (
          <p className="font-written text-ink py-4 text-center">✓ Hinzugefügt!</p>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="font-written text-ink-faded text-sm">Plan</span>
              <select
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  setDayIndex(0);
                }}
                className="border-ink-light font-written text-ink mt-1 block w-full border-b border-dotted bg-transparent outline-none"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="font-written text-ink-faded text-sm">Tag</span>
              <select
                value={dayIndex}
                onChange={(e) => setDayIndex(Number(e.target.value))}
                className="border-ink-light font-written text-ink mt-1 block w-full border-b border-dotted bg-transparent outline-none"
              >
                {(selectedPlan?.days ?? []).map((d) => (
                  <option key={d.index} value={d.index}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>

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

            <button
              onClick={handleSubmit}
              disabled={isPending || !planId}
              className="bg-ribbon font-hand text-paper-50 shadow-card w-full rounded-sm py-2 text-xl disabled:opacity-50"
            >
              Hinzufügen
            </button>
          </div>
        )}
      </OmaDialog>
    </>
  );
}
