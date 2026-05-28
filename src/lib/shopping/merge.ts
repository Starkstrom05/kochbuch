import { addAmounts, normaliseUnit } from "@/lib/units/units";

export type ExistingItem = {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  checked: boolean;
};

export type ManualInput = {
  name: string;
  amount: number | null;
  unit: string | null;
};

export type MergePlan =
  | { kind: "create" }
  | { kind: "merge"; targetId: string; amount: number | null; unit: string | null };

/**
 * Beim manuellen Hinzufügen: existiert schon ein NICHT abgehaktes Item mit
 * gleichem (normalisiertem) Namen und addierbarer Einheit, mergen wir die
 * Mengen statt ein Duplikat anzulegen. Abgehakte Items bleiben unberührt — ein
 * erneutes Hinzufügen meint dann einen neuen Bedarf. Inkompatible Einheiten
 * führen zu einem neuen Item; consolidateList zeigt sie weiterhin als eine
 * Gruppe an, nur ohne aufsummierte Gesamtmenge.
 */
export function planManualMerge(existing: ExistingItem[], input: ManualInput): MergePlan {
  const key = input.name.toLowerCase().trim();
  const target = existing.find((i) => !i.checked && i.name.toLowerCase().trim() === key);
  if (!target) return { kind: "create" };

  const combined = addAmounts(
    { amount: target.amount, unit: normaliseUnit(target.unit ?? "") || null },
    { amount: input.amount, unit: normaliseUnit(input.unit ?? "") || null },
  );
  if (combined === null) return { kind: "create" };

  return { kind: "merge", targetId: target.id, amount: combined.amount, unit: combined.unit };
}
