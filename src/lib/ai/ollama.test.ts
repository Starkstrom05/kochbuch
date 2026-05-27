import { describe, it, expect } from "vitest";
import { extractJson, aiRecipeSchema } from "./ollama";

describe("extractJson", () => {
  it("returns the body of a ```json``` fence", () => {
    const input = '```json\n{"title": "Test"}\n```';
    expect(extractJson(input)).toBe('{"title": "Test"}');
  });

  it("returns the body of an unlabelled ``` fence", () => {
    const input = '```\n{"a": 1}\n```';
    expect(extractJson(input)).toBe('{"a": 1}');
  });

  it("slices between first { and last } when no fence is present", () => {
    const input = 'Hier ist dein Rezept: {"title": "Pasta", "servings": 4} — viel Spaß!';
    expect(extractJson(input)).toBe('{"title": "Pasta", "servings": 4}');
  });

  it("handles nested objects inside the slice", () => {
    const input = 'prefix {"a": {"b": 1}, "c": [1, 2]} suffix';
    expect(extractJson(input)).toBe('{"a": {"b": 1}, "c": [1, 2]}');
  });

  it("returns the trimmed input when there is no JSON-like content", () => {
    expect(extractJson("  no json here  ")).toBe("no json here");
  });

  it("prefers a fence over loose braces in the surrounding prose", () => {
    const input = 'Antwort: ```json\n{"x": 1}\n``` aber auch {"y": 2}';
    expect(extractJson(input)).toBe('{"x": 1}');
  });

  it("returns trimmed input when only an opening brace is present", () => {
    const input = "{ unfertig";
    expect(extractJson(input)).toBe("{ unfertig");
  });
});

describe("aiRecipeSchema", () => {
  const minimal = {
    title: "Pfannkuchen",
    ingredients: [{ name: "Mehl", amount: 200, unit: "g" }],
    instructions: "1. Verrühren.\n2. Backen.",
  };

  it("accepts a minimal payload and fills defaults", () => {
    const parsed = aiRecipeSchema.parse(minimal);
    expect(parsed.title).toBe("Pfannkuchen");
    expect(parsed.description).toBe("");
    expect(parsed.servings).toBe(4);
    expect(parsed.tags).toEqual([]);
    expect(parsed.imageUrls).toEqual([]);
  });

  it("coerces stringified servings (LLMs love quoting numbers)", () => {
    const parsed = aiRecipeSchema.parse({ ...minimal, servings: "6" });
    expect(parsed.servings).toBe(6);
  });

  it("coerces stringified ingredient amounts", () => {
    const parsed = aiRecipeSchema.parse({
      ...minimal,
      ingredients: [{ name: "Salz", amount: "0.5", unit: "TL" }],
    });
    expect(parsed.ingredients[0].amount).toBe(0.5);
  });

  it("allows null amounts for unspecified quantities", () => {
    const parsed = aiRecipeSchema.parse({
      ...minimal,
      ingredients: [{ name: "Salz", amount: null, unit: "", note: "nach Geschmack" }],
    });
    expect(parsed.ingredients[0].amount).toBeNull();
  });

  it("rejects an empty ingredient list", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, ingredients: [] })).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, title: "" })).toThrow();
  });

  it("rejects empty instructions", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, instructions: "" })).toThrow();
  });

  it("rejects a title longer than 200 chars", () => {
    expect(() => aiRecipeSchema.parse({ ...minimal, title: "x".repeat(201) })).toThrow();
  });

  it("rejects negative ingredient amounts (LLM hallucinations)", () => {
    expect(() =>
      aiRecipeSchema.parse({
        ...minimal,
        ingredients: [{ name: "Salz", amount: -1, unit: "g" }],
      }),
    ).toThrow();
  });
});
