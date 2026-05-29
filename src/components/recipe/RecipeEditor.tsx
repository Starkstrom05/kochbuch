"use client";

import { useEffect, useRef, useState } from "react";
import { PaperSheet } from "@/components/oma/PaperSheet";

type IngredientDraft = {
  name: string;
  amount: string;
  unit: string;
  note: string;
};

/** Schritt-Entwurf; `duration` ist Minuten als String (leer = kein Timer). */
type StepDraft = {
  text: string;
  duration: string;
};

type ExistingImage = { id: string; path: string };

type NewImage = {
  /** Stabile Local-ID fuer key/reorder, NICHT die DB-ID. */
  localId: string;
  file: File;
  previewUrl: string;
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
    steps?: { text: string; durationSeconds: number | null }[];
    notes: string;
    nutritionKcal?: number | null;
    nutritionProteinG?: number | null;
    nutritionCarbsG?: number | null;
    nutritionFatG?: number | null;
    sourceUrl: string;
    sourceType?: string;
    tags: string;
    categoryIds: string[];
    ingredients: IngredientDraft[];
    /** Bestehende Rezeptbilder (Edit-Mode), in DB-Reihenfolge. */
    images?: ExistingImage[];
    /** Bild-URLs aus dem Web-Import (Create-Mode). Werden beim Speichern
     *  serverseitig heruntergeladen. */
    imageUrls?: string[];
  };
  submitLabel: string;
};

const EMPTY_ING: IngredientDraft = { name: "", amount: "", unit: "", note: "" };
const EMPTY_STEP: StepDraft = { text: "", duration: "" };

const COMMON_UNITS = ["g", "kg", "ml", "l", "EL", "TL", "Stk", "Prise", ""];

function initialSteps(initial: Props["initial"]): StepDraft[] {
  if (initial?.steps?.length) {
    return initial.steps.map((s) => ({
      text: s.text,
      duration: s.durationSeconds != null ? String(Math.round(s.durationSeconds / 60)) : "",
    }));
  }
  if (initial?.instructions?.trim()) {
    return initial.instructions
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ text, duration: "" }));
  }
  return [EMPTY_STEP];
}

export function RecipeEditor({ action, categories, initial, submitLabel }: Props) {
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initial?.ingredients?.length ? initial.ingredients : [EMPTY_ING],
  );
  const [steps, setSteps] = useState<StepDraft[]>(() => initialSteps(initial));

  // Verstecktes instructions-Feld bleibt aus den Schritt-Texten synchron, damit
  // die bestehende Zod-Pflicht + Detailseite/Buch/PDF weiterhin funktionieren.
  const instructionsValue = steps
    .map((s) => s.text.trim())
    .filter(Boolean)
    .join("\n");

  function updateStep(idx: number, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function removeStep(idx: number) {
    setSteps((prev) => (prev.length === 1 ? [EMPTY_STEP] : prev.filter((_, i) => i !== idx)));
  }

  function addStep() {
    setSteps((prev) => [...prev, EMPTY_STEP]);
  }

  // Bilder-Verwaltung:
  //   - existing: bestehende DB-Bilder, in Reihenfolge bearbeitbar
  //   - newImages: lokal ausgewaehlte Dateien (mit Object-URL fuer Preview)
  //   - importedUrls: URLs aus dem Web-Import (Create-Mode), werden beim Save runtergeladen
  const [existing, setExisting] = useState<ExistingImage[]>(initial?.images ?? []);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [importedUrls, setImportedUrls] = useState<string[]>(initial?.imageUrls ?? []);
  const newIdCounter = useRef(0);

  // Object-URLs aufraeumen, damit Memory nicht leaked.
  useEffect(() => {
    return () => {
      for (const img of newImages) URL.revokeObjectURL(img.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addNewFiles(fileList: FileList | null) {
    if (!fileList) return;
    const toAdd: NewImage[] = [];
    for (const file of Array.from(fileList)) {
      if (!file.type.startsWith("image/")) continue;
      newIdCounter.current += 1;
      toAdd.push({
        localId: `new-${newIdCounter.current}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (toAdd.length) setNewImages((prev) => [...prev, ...toAdd]);
  }

  function removeExisting(id: string) {
    setExisting((prev) => prev.filter((img) => img.id !== id));
  }

  function removeNew(localId: string) {
    setNewImages((prev) => {
      const target = prev.find((img) => img.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((img) => img.localId !== localId);
    });
  }

  function removeImportedUrl(url: string) {
    setImportedUrls((prev) => prev.filter((u) => u !== url));
  }

  function moveExisting(id: string, dir: -1 | 1) {
    setExisting((prev) => {
      const idx = prev.findIndex((img) => img.id === id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  // Server Actions submitten die native FormData. Damit unsere im State
  // gehaltenen new-Files mitgehen, halten wir einen versteckten <input
  // type="file" name="newImage" multiple> synchron via DataTransfer.
  const newFilesInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const input = newFilesInputRef.current;
    if (!input || typeof DataTransfer === "undefined") return;
    const dt = new DataTransfer();
    for (const img of newImages) dt.items.add(img.file);
    input.files = dt.files;
  }, [newImages]);

  function updateIng(idx: number, patch: Partial<IngredientDraft>) {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, ...patch } : ing)));
  }

  function removeIng(idx: number) {
    setIngredients((prev) => (prev.length === 1 ? [EMPTY_ING] : prev.filter((_, i) => i !== idx)));
  }

  function addIng() {
    setIngredients((prev) => [...prev, EMPTY_ING]);
  }

  const totalImages = existing.length + newImages.length + importedUrls.length;

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="sourceType" value={initial?.sourceType ?? "MANUAL"} />

      {/* Bestehende Bilder, die behalten werden — in aktueller Reihenfolge. */}
      {existing.map((img) => (
        <input key={img.id} type="hidden" name="keepImageId" value={img.id} />
      ))}

      {/* Neue lokal ausgewaehlte Files. Sync via DataTransfer in useEffect. */}
      <input
        ref={newFilesInputRef}
        type="file"
        name="newImage"
        multiple
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden
      />

      {/* Bild-URLs aus Web-Import (Create-Mode). */}
      {importedUrls.map((url) => (
        <input key={url} type="hidden" name="imageUrl" value={url} />
      ))}

      <section className="paper-card p-4 sm:p-6">
        <h2 className="font-hand text-ink mb-3 text-2xl">Bilder</h2>
        {totalImages === 0 ? (
          <p className="font-written text-ink-faded text-sm">
            Keine Bilder. Das erste Bild ist automatisch das Cover.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {existing.map((img, i) => (
              <li
                key={img.id}
                className="group ring-paper-300 relative aspect-[4/3] overflow-hidden rounded-sm ring-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/images${img.path}`}
                  alt={`Bild ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                {i === 0 ? (
                  <span className="bg-ribbon font-hand text-paper-50 absolute top-1 left-1 rounded-sm px-1.5 py-0.5 text-xs">
                    Cover
                  </span>
                ) : null}
                <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1 opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveExisting(img.id, -1)}
                      disabled={i === 0}
                      className="bg-paper-50/90 font-hand rounded-sm px-1.5 py-0.5 text-sm shadow disabled:opacity-30"
                      aria-label="Nach links"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveExisting(img.id, 1)}
                      disabled={i === existing.length - 1}
                      className="bg-paper-50/90 font-hand rounded-sm px-1.5 py-0.5 text-sm shadow disabled:opacity-30"
                      aria-label="Nach rechts"
                    >
                      →
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExisting(img.id)}
                    className="bg-paper-50/90 font-hand text-ribbon inline-flex h-11 w-11 items-center justify-center rounded-sm text-base shadow"
                    aria-label="Bild entfernen"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {newImages.map((img, i) => (
              <li
                key={img.localId}
                className="group ring-sepia relative aspect-[4/3] overflow-hidden rounded-sm ring-1"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={`Neues Bild ${i + 1}`}
                  className="h-full w-full object-cover"
                />
                <span className="bg-sepia font-hand text-paper-50 absolute top-1 left-1 rounded-sm px-1.5 py-0.5 text-xs">
                  Neu
                </span>
                <button
                  type="button"
                  onClick={() => removeNew(img.localId)}
                  className="bg-paper-50/90 font-hand text-ribbon absolute right-1 bottom-1 inline-flex h-11 w-11 items-center justify-center rounded-sm text-base opacity-0 shadow transition group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  aria-label="Bild entfernen"
                >
                  ✕
                </button>
              </li>
            ))}
            {importedUrls.map((url) => (
              <li
                key={url}
                className="group ring-sepia relative aspect-[4/3] overflow-hidden rounded-sm ring-1"
              >
                {/* Externe CDN-URLs (z.B. Akamai) blocken Browser-Embeds
                    teilweise — Vorschau über unseren Server-Proxy, das hidden
                    imageUrl-Input bleibt die Original-URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/image-proxy?url=${encodeURIComponent(url)}`}
                  alt="Importiertes Bild"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="bg-sepia font-hand text-paper-50 absolute top-1 left-1 rounded-sm px-1.5 py-0.5 text-xs">
                  Import
                </span>
                <button
                  type="button"
                  onClick={() => removeImportedUrl(url)}
                  className="bg-paper-50/90 font-hand text-ribbon absolute right-1 bottom-1 inline-flex h-11 w-11 items-center justify-center rounded-sm text-base opacity-0 shadow transition group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                  aria-label="Bild entfernen"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <label className="bg-paper-200 font-hand text-ink ring-paper-300 hover:bg-paper-300/60 inline-block cursor-pointer rounded-sm px-4 py-1.5 text-base ring-1">
            + Bilder hinzufügen
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => addNewFiles(e.target.files)}
            />
          </label>
        </div>
      </section>

      <PaperSheet seed={initial?.id ?? "new"} className="p-6 sm:p-10">
        <div className="space-y-6">
          <label className="block">
            <span className="font-written text-ink-faded text-sm">Titel</span>
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              className="font-hand text-ink placeholder:text-ink-light/60 mt-1 w-full bg-transparent text-4xl outline-none"
              placeholder="z.B. Merys Kartoffelsalat"
            />
          </label>

          <label className="block">
            <span className="font-written text-ink-faded text-sm">Kurzbeschreibung</span>
            <textarea
              name="description"
              defaultValue={initial?.description ?? ""}
              rows={2}
              className="font-written text-ink-faded mt-1 w-full bg-transparent text-lg outline-none"
              placeholder="In einem Satz: was zeichnet das Rezept aus?"
            />
          </label>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <FormNumber
              name="servings"
              label="Portionen"
              defaultValue={initial?.servings ?? 4}
              min={1}
              max={99}
            />
            <FormNumber
              name="prepMinutes"
              label="Vorbereitung (min)"
              defaultValue={initial?.prepMinutes ?? ""}
              min={0}
            />
            <FormNumber
              name="cookMinutes"
              label="Kochen (min)"
              defaultValue={initial?.cookMinutes ?? ""}
              min={0}
            />
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
            <legend className="font-written text-ink-faded text-sm">Kategorien</legend>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <label
                  key={c.id}
                  className="bg-paper-100 font-written ring-paper-300 has-[:checked]:bg-ribbon has-[:checked]:text-paper-50 has-[:focus-visible]:ring-ribbon inline-flex min-h-[44px] cursor-pointer items-center rounded-sm px-3 py-1 text-sm ring-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-offset-2"
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
            <span className="font-written text-ink-faded text-sm">Tags (Komma-separiert)</span>
            <input
              name="tags"
              defaultValue={initial?.tags ?? ""}
              className="border-ink-light font-written text-ink mt-1 w-full border-b border-dotted bg-transparent outline-none"
              placeholder="winter, vegetarisch, schnell"
            />
          </label>
        </div>
      </PaperSheet>

      <PaperSheet variant="lined" seed={`${initial?.id ?? "new"}-ing`} className="p-6 sm:p-10">
        <h3 className="font-hand text-ink ink-text text-3xl">Zutaten</h3>
        <p className="font-written text-ink-faded text-sm">
          Mengen werden später automatisch skaliert.
        </p>

        <ul className="mt-4 space-y-2">
          {ingredients.map((ing, i) => (
            <li
              key={i}
              className="border-ink-light/40 grid grid-cols-12 items-center gap-2 border-b border-dotted py-1"
            >
              <input
                name="ing-amount"
                value={ing.amount}
                onChange={(e) => updateIng(i, { amount: e.target.value })}
                placeholder="200"
                inputMode="decimal"
                aria-label={`Menge fuer Zutat ${i + 1}`}
                className="placeholder:text-ink-light/40 col-span-2 bg-transparent font-serif outline-none"
              />
              <input
                name="ing-unit"
                list="units-list"
                value={ing.unit}
                onChange={(e) => updateIng(i, { unit: e.target.value })}
                placeholder="g"
                aria-label={`Einheit fuer Zutat ${i + 1}`}
                className="placeholder:text-ink-light/40 col-span-2 bg-transparent font-serif outline-none"
              />
              <input
                name="ing-name"
                value={ing.name}
                onChange={(e) => updateIng(i, { name: e.target.value })}
                placeholder="Mehl"
                aria-label={`Name fuer Zutat ${i + 1}`}
                className="font-written text-ink placeholder:text-ink-light/40 col-span-5 bg-transparent text-lg outline-none"
              />
              <input
                name="ing-note"
                value={ing.note}
                onChange={(e) => updateIng(i, { note: e.target.value })}
                placeholder="fein gemahlen"
                aria-label={`Notiz fuer Zutat ${i + 1}`}
                className="font-written text-ink-faded placeholder:text-ink-light/40 col-span-2 bg-transparent text-sm italic outline-none"
              />
              <button
                type="button"
                onClick={() => removeIng(i)}
                aria-label="Zeile entfernen"
                className="font-hand text-ribbon col-span-1 inline-flex min-h-[44px] items-center justify-end text-xl hover:scale-110"
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
          className="font-hand text-ribbon mt-4 text-xl underline decoration-wavy underline-offset-4"
        >
          + noch eine Zutat
        </button>
      </PaperSheet>

      <PaperSheet seed={`${initial?.id ?? "new"}-steps`} className="p-6 sm:p-10">
        <h3 className="font-hand text-ink ink-text text-3xl">Zubereitung</h3>
        <p className="font-written text-ink-faded text-sm">
          Ein Schritt pro Zeile. Dauer (min) optional — wird im Koch-Modus zum Timer.
        </p>

        {/* instructions bleibt die kompatible Textquelle, synchron aus den Schritten. */}
        <input type="hidden" name="instructions" value={instructionsValue} readOnly />

        <ul className="mt-4 space-y-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className="border-ink-light/40 flex items-start gap-2 border-b border-dotted pb-3"
            >
              <span className="font-hand text-ribbon mt-2 w-6 flex-shrink-0 text-center text-xl">
                {i + 1}.
              </span>
              <textarea
                name="step-text"
                value={step.text}
                onChange={(e) => updateStep(i, { text: e.target.value })}
                rows={2}
                placeholder="Zwiebeln klein hacken..."
                className="font-written text-ink placeholder:text-ink-light/40 min-w-0 flex-1 resize-y bg-transparent text-lg outline-none"
              />
              <label className="flex flex-shrink-0 items-center gap-1">
                <input
                  name="step-duration"
                  value={step.duration}
                  onChange={(e) => updateStep(i, { duration: e.target.value })}
                  inputMode="numeric"
                  placeholder="–"
                  className="border-ink-light text-ink placeholder:text-ink-light/40 w-12 border-b border-dotted bg-transparent text-center font-serif outline-none"
                  aria-label={`Dauer Schritt ${i + 1} in Minuten`}
                />
                <span className="font-written text-ink-faded text-xs">min</span>
              </label>
              <button
                type="button"
                onClick={() => removeStep(i)}
                aria-label="Schritt entfernen"
                className="font-hand text-ribbon inline-flex min-h-[44px] items-center text-xl hover:scale-110"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={addStep}
          className="font-hand text-ribbon mt-4 text-xl underline decoration-wavy underline-offset-4"
        >
          + noch ein Schritt
        </button>

        <h3 className="font-hand text-ink ink-text mt-6 text-2xl">Notizen (optional)</h3>
        <textarea
          name="notes"
          defaultValue={initial?.notes ?? ""}
          rows={3}
          className="font-written text-ink-faded mt-2 w-full bg-transparent italic outline-none"
          placeholder="Merys Geheimtipp..."
        />

        <h3 className="font-hand text-ink ink-text mt-6 text-2xl">
          Nährwerte pro Portion (optional)
        </h3>
        <p className="font-written text-ink-faded text-sm">
          Leer lassen → wird aus den Zutaten geschätzt. Eigene Werte überschreiben die Schätzung.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <FormNumber
            name="nutritionKcal"
            label="kcal"
            defaultValue={initial?.nutritionKcal ?? ""}
            min={0}
          />
          <FormNumber
            name="nutritionProteinG"
            label="Eiweiß (g)"
            defaultValue={initial?.nutritionProteinG ?? ""}
            min={0}
          />
          <FormNumber
            name="nutritionCarbsG"
            label="Kohlenh. (g)"
            defaultValue={initial?.nutritionCarbsG ?? ""}
            min={0}
          />
          <FormNumber
            name="nutritionFatG"
            label="Fett (g)"
            defaultValue={initial?.nutritionFatG ?? ""}
            min={0}
          />
        </div>

        <label className="mt-6 block">
          <span className="font-written text-ink-faded text-sm">Quelle (URL, optional)</span>
          <input
            name="sourceUrl"
            type="url"
            defaultValue={initial?.sourceUrl ?? ""}
            className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif text-sm outline-none"
            placeholder="https://www.chefkoch.de/..."
          />
        </label>
      </PaperSheet>

      <div className="flex items-center justify-end gap-4">
        <button
          type="submit"
          className="bg-ribbon font-hand text-paper-50 shadow-card rounded-sm px-6 py-2 text-2xl hover:rotate-[-0.5deg]"
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
      <span className="font-written text-ink-faded text-sm">{label}</span>
      <input
        name={name}
        type="number"
        defaultValue={defaultValue}
        min={min}
        max={max}
        className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
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
      <span className="font-written text-ink-faded text-sm">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
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
