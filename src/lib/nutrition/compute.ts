import { classify, normaliseUnit, toBaseAmount } from "@/lib/units/units";

export type NutritionPer100 = {
  kcal: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type ComputeIngredient = {
  amount: number | null;
  unit: string | null;
  density: number | null;
  nutrition: NutritionPer100 | null;
};

export type NutritionTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type ComputedNutrition = {
  perPortion: NutritionTotals;
  total: NutritionTotals;
  /** true, wenn alle Zutaten MIT Menge berücksichtigt werden konnten */
  complete: boolean;
  countedCount: number;
  missingCount: number;
};

/** Wandelt eine Menge in Gramm um (Masse direkt, Volumen via Dichte). */
export function gramsOf(amount: number, unit: string | null, density: number | null): number | null {
  const u = normaliseUnit(unit ?? "");
  const cls = classify(u);
  if (cls === "mass") return toBaseAmount(amount, u).amount; // Basis g
  if (cls === "volume") {
    if (density == null) return null;
    return toBaseAmount(amount, u).amount * density; // ml * g/ml
  }
  return null; // count / other → ohne Stückgewicht nicht umrechenbar
}

export function computeRecipeNutrition(
  ingredients: ComputeIngredient[],
  servings: number,
): ComputedNutrition {
  const total: NutritionTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  let counted = 0;
  let missing = 0;

  for (const ing of ingredients) {
    // Zutaten ohne Menge (z. B. „Salz nach Geschmack") ignorieren — sie zählen
    // nicht als Lücke.
    if (ing.amount == null || ing.amount <= 0) continue;
    if (!ing.nutrition) {
      missing++;
      continue;
    }
    const grams = gramsOf(ing.amount, ing.unit, ing.density);
    if (grams == null) {
      missing++;
      continue;
    }
    const factor = grams / 100;
    total.kcal += ing.nutrition.kcal * factor;
    total.proteinG += (ing.nutrition.proteinG ?? 0) * factor;
    total.carbsG += (ing.nutrition.carbsG ?? 0) * factor;
    total.fatG += (ing.nutrition.fatG ?? 0) * factor;
    counted++;
  }

  const s = servings > 0 ? servings : 1;
  const perPortion: NutritionTotals = {
    kcal: total.kcal / s,
    proteinG: total.proteinG / s,
    carbsG: total.carbsG / s,
    fatG: total.fatG / s,
  };

  return {
    perPortion,
    total,
    complete: missing === 0 && counted > 0,
    countedCount: counted,
    missingCount: missing,
  };
}

export type RecipeNutritionOverride = {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

export type NutritionDisplay = {
  source: "manual" | "auto" | "none";
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  /** Bei auto: ob alle Zutaten berücksichtigt wurden; bei manual: immer true. */
  complete: boolean;
};

/** Override (pro Portion) gewinnt; sonst Auto-Schätzung; sonst nichts. */
export function resolveNutrition(
  auto: ComputedNutrition,
  override: RecipeNutritionOverride,
): NutritionDisplay {
  if (override.kcal != null) {
    return {
      source: "manual",
      kcal: override.kcal,
      proteinG: override.proteinG,
      carbsG: override.carbsG,
      fatG: override.fatG,
      complete: true,
    };
  }
  if (auto.countedCount > 0) {
    return {
      source: "auto",
      kcal: auto.perPortion.kcal,
      proteinG: auto.perPortion.proteinG,
      carbsG: auto.perPortion.carbsG,
      fatG: auto.perPortion.fatG,
      complete: auto.complete,
    };
  }
  return { source: "none", kcal: null, proteinG: null, carbsG: null, fatG: null, complete: false };
}
