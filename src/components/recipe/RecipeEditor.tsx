"use client";

import { useState } from "react";
import { PaperSheet } from "@/components/oma/PaperSheet";

type IngredientDraft = {
  name: string;
  amount: string;
  unit: string;
  note: string;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  categories: { id: string; name: string; icon: string | null }[];
  initial?: {
    id?: string;
    title: string;
    description: string;
    servings: number;
    prepMinutes: number | null;
    cookMinutes: number | null;
    difficulty: number | null;
    instructions: string;
    notes: string;
    sourceUrl: string;
    sourceType?: string;
    tags: string;
    categoryIds: string[];
    ingredients: IngredientDraft[];
  };
  submitLabel: string;
};

const EMPTY_ING: IngredientDraft = { name: "", amount: "", unit: "", note: "" };

const COMMON_UNITS = ["g", "kg", "ml", "l", "EL", "TL", "Stk", "Prise", ""];

export function RecipeEditor({ action, categories, initial, submitLabel }: Props) {
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initial?.ingredients?.length ? initial.ingredients : [EMPTY_ING],
  );

  function updateIng(idx: number, patch: Partial<IngredientDraft>) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)));
  }

  function removeIng(idx: number) {
    setIngredients((prev) => (prev.length === 1 ? [EMPTY_ING] : prev.filter((_, i) => i !== idx)));
  }

  function addIng() {
    setIngredients((prev) => [...prev, EMPTY_ING]);
  }

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="sourceType" value={initial?.sourceType ?? "MANUAL"} />
      <PaperSheet seed={initial?.id ?? "new"} className="p-6 sm:p-10">
        <div className="space-y-6">
          <label className="block">
            <span className="font-written text-sm text-ink-faded">Titel</span>
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              className="mt-1 w-full bg-transparent font-hand text-4xl text-ink outline-none placeholder:text-ink-light/60"
              placeholder="z.B. Omas Kartoffelsalat"
            />
          </label>

          <label className="block">
            <span className="font-written text-sm text-ink-faded">Kurzbeschreibung</span>
            <textarea
              name="description"
              defaultValue={initial?.description ?? ""}
              rows={2}
              className="mt-1 w-full bg-transparent font-written text-lg text-ink-faded outline-none"
              placeholder="In einem Satz: was zeichnet das Rezept aus?"
            />
          </label>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormNumber name="servings" label="Portionen" defaultValue={initial?.servings ?? 4} min={1} max={99} />
            <FormNumber name="prepMinutes" label="Vorbereitung (min)" defaultValue={initial?.prepMinutes ?? ""} min={0} />
            <FormNumber name="cookMinutes" label="Kochen (min)" defaultValue={initial?.cookMinutes ?? ""} min={0} />
            <FormSelect
              name="difficulty"
              label="Schwierigkeit"
              defaultValue={initial?.difficulty != null ? String(initial.difficulty) : ""}
              options={[
                { value: "", label: "—" },
                { value: "1", label: "leicht" },
                { value: "2", label: "mittel" },
                { value: "3", label: "schwer" },
              ]}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="font-written text-sm text-ink-faded">Kategorien</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="cursor-pointer rounded-sm bg-paper-100 px-2 py-1 font-written text-sm ring-1 ring-paper-300 has-[:checked]:bg-ribbon has-[:checked]:text-paper-50"
                >
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={c.id}
                    defaultChecked={initial?.categoryIds.includes(c.id) ?? false}
                    className="sr-only"
                  />
                  {c.icon} {c.name}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="font-written text-sm text-ink-faded">Tags (Komma-separiert)</span>
            <input
              name="tags"
              defaultValue={initial?.tags ?? ""}
              className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-written text-ink outline-none"
              placeholder="winter, vegetarisch, schnell"
            />
          </label>
        </div>
      </PaperSheet>

      <PaperSheet variant="lined" seed={`${initial?.id ?? "new"}-ing`} className="p-6 sm:p-10">
        <h3 className="font-hand text-3xl text-ink ink-text">Zutaten</h3>
        <p className="font-written text-sm text-ink-faded">Mengen werden später automatisch skaliert.</p>

        <ul className="mt-4 space-y-2">
          {ingredients.map((ing, i) => (
            <li
              key={i}
              className="grid grid-cols-12 items-center gap-2 border-b border-dotted border-ink-light/40 py-1"
            >
              <input
                name="ing-amount"
                value={ing.amount}
                onChange={(e) => updateIng(i, { amount: e.target.value })}
                placeholder="200"
                inputMode="decimal"
                className="col-span-2 bg-transparent font-serif outline-none placeholder:text-ink-light/40"
              />
              <input
                name="ing-unit"
                list="units-list"
                value={ing.unit}
                onChange={(e) => updateIng(i, { unit: e.target.value })}
                placeholder="g"
                className="col-span-2 bg-transparent font-serif outline-none placeholder:text-ink-light/40"
              />
              <input
                name="ing-name"
                value={ing.name}
                onChange={(e) => updateIng(i, { name: e.target.value })}
                placeholder="Mehl"
                className="col-span-5 bg-transparent font-written text-lg text-ink outline-none placeholder:text-ink-light/40"
              />
              <input
                name="ing-note"
                value={ing.note}
                onChange={(e) => updateIng(i, { note: e.target.value })}
                placeholder="fein gemahlen"
                className="col-span-2 bg-transparent font-written text-sm italic text-ink-faded outline-none placeholder:text-ink-light/40"
              />
              <button
                type="button"
                onClick={() => removeIng(i)}
                aria-label="Zeile entfernen"
                className="col-span-1 text-right font-hand text-xl text-ribbon hover:scale-110"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <datalist id="units-list">
          {COMMON_UNITS.filter(Boolean).map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>

        <button
          type="button"
          onClick={addIng}
          className="mt-4 font-hand text-xl text-ribbon underline decoration-wavy underline-offset-4"
        >
          + noch eine Zutat
        </button>
      </PaperSheet>

      <PaperSheet seed={`${initial?.id ?? "new"}-steps`} className="p-6 sm:p-10">
        <h3 className="font-hand text-3xl text-ink ink-text">Zubereitung</h3>
        <textarea
          name="instructions"
          required
          defaultValue={initial?.instructions ?? ""}
          rows={10}
          className="mt-3 w-full bg-transparent font-written text-lg text-ink outline-none"
          placeholder="1. Zwiebeln klein hacken...
2. ..."
        />

        <h3 className="mt-6 font-hand text-2xl text-ink ink-text">Notizen (optional)</h3>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={3}
          className="mt-2 w-full bg-transparent font-written italic text-ink-faded outline-none"
          placeholder="Omas Geheimtipp..."
        />

        <label className="mt-6 block">
          <span className="font-written text-sm text-ink-faded">Quelle (URL, optional)</span>
          <input
            name="sourceUrl"
            type="url"
            defaultValue={initial?.sourceUrl ?? ""}
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-sm text-ink outline-none"
            placeholder="https://www.chefkoch.de/..."
          />
        </label>
      </PaperSheet>

      <div className="flex items-center justify-end gap-4">
        <button
          type="submit"
          className="rounded-sm bg-ribbon px-6 py-2 font-hand text-2xl text-paper-50 shadow-card hover:rotate-[-0.5deg]"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function FormNumber({
  name,
  label,
  defaultValue,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue: number | string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="font-written text-sm text-ink-faded">{label}</span>
      <input
        name={name}
        type="number"
        defaultValue={defaultValue}
        min={min}
        max={max}
        className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
      />
    </label>
  );
}

function FormSelect({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="font-written text-sm text-ink-faded">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
