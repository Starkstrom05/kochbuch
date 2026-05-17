import { describe, expect, it } from "vitest";
import { buildMatcher, matchesPantry, rankMatches, type PantryMatcher } from "./server";

function r(
  id: string,
  ingredients: { ingredientId: string; name: string }[],
) {
  return {
    id,
    slug: id,
    title: id,
    servings: 4,
    images: [],
    ingredients: ingredients.map((i) => ({
      ingredientId: i.ingredientId,
      amount: null,
      unit: null,
      ingredient: { name: i.name },
    })),
  };
}

function mFromIds(ids: string[]): PantryMatcher {
  return { ids: new Set(ids), names: [] };
}

function mFromNames(names: string[]): PantryMatcher {
  return { ids: new Set(), names: names.map((s) => s.toLowerCase().trim()) };
}

describe("rankMatches", () => {
  it("liefert nur Rezepte mit ≥1 Treffer, sortiert nach matched DESC dann missing ASC", () => {
    const m = mFromIds(["mehl", "zucker", "ei"]);
    const out = rankMatches(m, [
      r("A", [{ ingredientId: "mehl", name: "Mehl" }, { ingredientId: "x", name: "X" }]),
      r("B", [
        { ingredientId: "mehl", name: "Mehl" },
        { ingredientId: "zucker", name: "Zucker" },
        { ingredientId: "ei", name: "Ei" },
      ]),
      r("C", [{ ingredientId: "y", name: "Y" }]),
      r("D", [
        { ingredientId: "mehl", name: "Mehl" },
        { ingredientId: "zucker", name: "Zucker" },
        { ingredientId: "ei", name: "Ei" },
        { ingredientId: "z", name: "Z" },
      ]),
    ]);

    expect(out.map((m) => m.recipeId)).toEqual(["B", "D", "A"]);
    expect(out.find((m) => m.recipeId === "C")).toBeUndefined();
  });

  it("ratio ist matched/total", () => {
    const out = rankMatches(mFromIds(["a"]), [
      r("X", [
        { ingredientId: "a", name: "A" },
        { ingredientId: "b", name: "B" },
      ]),
    ]);
    expect(out[0].ratio).toBe(0.5);
    expect(out[0].matched).toHaveLength(1);
    expect(out[0].missing).toHaveLength(1);
    expect(out[0].missing[0].name).toBe("B");
  });

  it("ignoriert Rezepte ohne Zutaten", () => {
    const out = rankMatches(mFromIds(["x"]), [r("leer", [])]);
    expect(out).toHaveLength(0);
  });

  it("liefert leeres Array bei leerer Pantry", () => {
    const out = rankMatches(mFromIds([]), [r("X", [{ ingredientId: "a", name: "A" }])]);
    expect(out).toHaveLength(0);
  });

  it("bei gleicher matched-Anzahl gewinnt das kürzere Rezept", () => {
    const out = rankMatches(mFromIds(["a", "b"]), [
      r("big", [
        { ingredientId: "a", name: "A" },
        { ingredientId: "b", name: "B" },
        { ingredientId: "c", name: "C" },
        { ingredientId: "d", name: "D" },
      ]),
      r("small", [
        { ingredientId: "a", name: "A" },
        { ingredientId: "b", name: "B" },
        { ingredientId: "x", name: "X" },
      ]),
    ]);
    expect(out.map((m) => m.recipeId)).toEqual(["small", "big"]);
  });
});

describe("matchesPantry — Substring-Fuzzy", () => {
  it("matched 'Ketchup' im Vorrat gegen Rezept-Zutat 'Tomatenketchup'", () => {
    const m = mFromNames(["Ketchup"]);
    expect(
      matchesPantry(m, { ingredientId: "x", ingredient: { name: "Tomatenketchup" } }),
    ).toBe(true);
  });

  it("matched in beide Richtungen — 'Tomatenketchup' im Vorrat gegen Rezept-Zutat 'Ketchup'", () => {
    const m = mFromNames(["Tomatenketchup"]);
    expect(
      matchesPantry(m, { ingredientId: "x", ingredient: { name: "Ketchup" } }),
    ).toBe(true);
  });

  it("Min-Länge 3: 'Ei' im Vorrat matched NICHT 'Eis'", () => {
    const m = mFromNames(["Ei"]);
    expect(
      matchesPantry(m, { ingredientId: "x", ingredient: { name: "Eis" } }),
    ).toBe(false);
  });

  it("Min-Länge 3: 'Eis' im Vorrat matched NICHT 'Ei'", () => {
    const m = mFromNames(["Eis"]);
    expect(
      matchesPantry(m, { ingredientId: "x", ingredient: { name: "Ei" } }),
    ).toBe(false);
  });

  it("case-insensitiv", () => {
    const m = mFromNames(["MEHL"]);
    expect(
      matchesPantry(m, { ingredientId: "x", ingredient: { name: "Weizenmehl" } }),
    ).toBe(true);
  });

  it("rankMatches profitiert vom Fuzzy-Match", () => {
    // Vorrat: "Ketchup" (eigene ingredientId "ketchup-pantry")
    // Rezept-Zutat: "Tomatenketchup" (ingredientId "tomatenketchup-recipe")
    // IDs unterscheiden sich — nur Fuzzy kann hier matchen.
    const matcher: PantryMatcher = {
      ids: new Set(["ketchup-pantry"]),
      names: ["ketchup"],
    };
    const out = rankMatches(matcher, [
      r("Burger-Sauce", [
        { ingredientId: "tomatenketchup-recipe", name: "Tomatenketchup" },
        { ingredientId: "essig", name: "Essig" },
      ]),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].matched.map((x) => x.name)).toContain("Tomatenketchup");
  });
});

describe("buildMatcher", () => {
  it("baut ids + lowercased names aus Pantry-Items", () => {
    const m = buildMatcher([
      { ingredientId: "i1", ingredient: { name: "  KETCHUP " } },
      { ingredientId: "i2", ingredient: { name: "Mehl" } },
    ]);
    expect(m.ids.has("i1")).toBe(true);
    expect(m.ids.has("i2")).toBe(true);
    expect(m.names).toEqual(["ketchup", "mehl"]);
  });
});
