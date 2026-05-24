import { describe, it, expect } from "vitest";
import {
  computeRecipeNutrition,
  gramsOf,
  resolveNutrition,
  type ComputeIngredient,
  type ComputedNutrition,
} from "./compute";

const flour = { kcal: 340, proteinG: 10, carbsG: 72, fatG: 1 };
const oil = { kcal: 884, proteinG: 0, carbsG: 0, fatG: 100 };

describe("gramsOf", () => {
  it("returns grams directly for mass units", () => {
    expect(gramsOf(500, "g", null)).toBe(500);
    expect(gramsOf(1, "kg", null)).toBe(1000);
  });

  it("converts volume to grams via density", () => {
    expect(gramsOf(100, "ml", 1.03)).toBeCloseTo(103);
    expect(gramsOf(2, "EL", 0.91)).toBeCloseTo(2 * 15 * 0.91); // 27.3
  });

  it("returns null for volume without density", () => {
    expect(gramsOf(100, "ml", null)).toBeNull();
  });

  it("returns null for count/other units", () => {
    expect(gramsOf(2, "Stk", null)).toBeNull();
    expect(gramsOf(1, "", null)).toBeNull();
  });
});

describe("computeRecipeNutrition", () => {
  it("sums grams-scaled nutrition and divides per portion", () => {
    const ings: ComputeIngredient[] = [
      { amount: 200, unit: "g", density: null, nutrition: flour }, // 2*340=680 kcal
      { amount: 100, unit: "ml", density: 0.91, nutrition: oil }, // 91g → 0.91*884=804.4 kcal
    ];
    const res = computeRecipeNutrition(ings, 4);
    expect(res.total.kcal).toBeCloseTo(680 + 804.44, 1);
    expect(res.perPortion.kcal).toBeCloseTo((680 + 804.44) / 4, 1);
    expect(res.complete).toBe(true);
    expect(res.countedCount).toBe(2);
  });

  it("ignores ingredients without an amount (to-taste)", () => {
    const ings: ComputeIngredient[] = [
      { amount: 100, unit: "g", density: null, nutrition: flour },
      { amount: null, unit: null, density: null, nutrition: { kcal: 0, proteinG: null, carbsG: null, fatG: null } },
    ];
    const res = computeRecipeNutrition(ings, 1);
    expect(res.complete).toBe(true);
    expect(res.countedCount).toBe(1);
    expect(res.missingCount).toBe(0);
  });

  it("marks incomplete when an ingredient with amount lacks data", () => {
    const ings: ComputeIngredient[] = [
      { amount: 100, unit: "g", density: null, nutrition: flour },
      { amount: 2, unit: "Stk", density: null, nutrition: { kcal: 155, proteinG: 13, carbsG: 1, fatG: 11 } }, // count → not convertible
    ];
    const res = computeRecipeNutrition(ings, 1);
    expect(res.complete).toBe(false);
    expect(res.missingCount).toBe(1);
    expect(res.countedCount).toBe(1);
  });

  it("treats null macros as zero", () => {
    const ings: ComputeIngredient[] = [
      { amount: 100, unit: "g", density: null, nutrition: { kcal: 50, proteinG: null, carbsG: null, fatG: null } },
    ];
    const res = computeRecipeNutrition(ings, 1);
    expect(res.total.kcal).toBe(50);
    expect(res.total.proteinG).toBe(0);
  });
});

describe("resolveNutrition", () => {
  const auto: ComputedNutrition = {
    perPortion: { kcal: 300, proteinG: 10, carbsG: 40, fatG: 8 },
    total: { kcal: 1200, proteinG: 40, carbsG: 160, fatG: 32 },
    complete: true,
    countedCount: 3,
    missingCount: 0,
  };

  it("prefers the manual override when kcal is set", () => {
    const d = resolveNutrition(auto, { kcal: 500, proteinG: 20, carbsG: null, fatG: null });
    expect(d.source).toBe("manual");
    expect(d.kcal).toBe(500);
    expect(d.complete).toBe(true);
  });

  it("falls back to auto when no override", () => {
    const d = resolveNutrition(auto, { kcal: null, proteinG: null, carbsG: null, fatG: null });
    expect(d.source).toBe("auto");
    expect(d.kcal).toBe(300);
  });

  it("returns none when neither override nor counted ingredients", () => {
    const empty: ComputedNutrition = {
      perPortion: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      total: { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      complete: false,
      countedCount: 0,
      missingCount: 0,
    };
    const d = resolveNutrition(empty, { kcal: null, proteinG: null, carbsG: null, fatG: null });
    expect(d.source).toBe("none");
    expect(d.kcal).toBeNull();
  });
});
