import { describe, expect, it } from "vitest";
import { rankMatches } from "./server";

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

describe("rankMatches", () => {
  it("liefert nur Rezepte mit ≥1 Treffer, sortiert nach matched DESC dann missing ASC", () => {
    const pantry = new Set(["mehl", "zucker", "ei"]);
    const out = rankMatches(pantry, [
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
    const pantry = new Set(["a"]);
    const out = rankMatches(pantry, [
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
    const pantry = new Set(["x"]);
    const out = rankMatches(pantry, [r("leer", [])]);
    expect(out).toHaveLength(0);
  });

  it("liefert leeres Array bei leerer Pantry", () => {
    const out = rankMatches(new Set(), [r("X", [{ ingredientId: "a", name: "A" }])]);
    expect(out).toHaveLength(0);
  });

  it("bei gleicher matched-Anzahl gewinnt das kürzere Rezept", () => {
    const pantry = new Set(["a", "b"]);
    const out = rankMatches(pantry, [
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
