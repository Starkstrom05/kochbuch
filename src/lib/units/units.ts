export const VOLUME_UNITS = ["ml", "cl", "l", "EL", "TL", "Tasse", "Prise"] as const;
export const MASS_UNITS = ["g", "kg"] as const;
export const COUNT_UNITS = ["Stk", "Stück", "Bund", "Zehe", "Scheibe", "Dose", "Packung"] as const;

export type Unit = string;

const TO_BASE_MASS: Record<string, number> = { g: 1, kg: 1000 };
const TO_BASE_VOLUME: Record<string, number> = {
  ml: 1,
  cl: 10,
  l: 1000,
  EL: 15,
  TL: 5,
  Tasse: 250,
  Prise: 0.3,
};

export function normaliseUnit(raw: string | null | undefined): string {
  if (!raw) return "";
  const t = raw.trim();
  const lower = t.toLowerCase();
  const map: Record<string, string> = {
    gramm: "g",
    kilogramm: "kg",
    milliliter: "ml",
    liter: "l",
    esslöffel: "EL",
    "esslöffel.": "EL",
    el: "EL",
    teelöffel: "TL",
    tl: "TL",
    stück: "Stk",
    stk: "Stk",
    "stk.": "Stk",
  };
  return map[lower] ?? t;
}

export function classify(unit: string): "mass" | "volume" | "count" | "other" {
  const u = normaliseUnit(unit);
  if (u in TO_BASE_MASS) return "mass";
  if (u in TO_BASE_VOLUME) return "volume";
  if ((COUNT_UNITS as readonly string[]).includes(u)) return "count";
  return "other";
}

export function toBaseAmount(amount: number, unit: string): { amount: number; base: string } {
  const u = normaliseUnit(unit);
  if (u in TO_BASE_MASS) return { amount: amount * TO_BASE_MASS[u], base: "g" };
  if (u in TO_BASE_VOLUME) return { amount: amount * TO_BASE_VOLUME[u], base: "ml" };
  return { amount, base: u };
}

export function fromBaseAmount(amount: number, base: string): { amount: number; unit: string } {
  if (base === "g" && amount >= 1000) return { amount: amount / 1000, unit: "kg" };
  if (base === "ml" && amount >= 1000) return { amount: amount / 1000, unit: "l" };
  return { amount, unit: base };
}

export function addAmounts(
  a: { amount: number | null; unit: string | null },
  b: { amount: number | null; unit: string | null },
): { amount: number | null; unit: string | null } | null {
  if (a.amount == null && b.amount == null) return { amount: null, unit: a.unit ?? b.unit };
  if (a.amount == null) return { amount: b.amount, unit: b.unit };
  if (b.amount == null) return { amount: a.amount, unit: a.unit };

  const unitA = normaliseUnit(a.unit ?? "");
  const unitB = normaliseUnit(b.unit ?? "");
  const classA = classify(unitA);
  const classB = classify(unitB);

  if (classA !== classB || classA === "other") {
    if (unitA === unitB) return { amount: a.amount + b.amount, unit: unitA };
    return null;
  }

  const baseA = toBaseAmount(a.amount, unitA);
  const baseB = toBaseAmount(b.amount, unitB);
  if (baseA.base !== baseB.base) return null;
  const combined = fromBaseAmount(baseA.amount + baseB.amount, baseA.base);
  return { amount: combined.amount, unit: combined.unit };
}
