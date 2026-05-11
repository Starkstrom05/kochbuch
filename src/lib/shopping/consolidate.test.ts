import { describe, it, expect } from "vitest";
import { consolidateList } from "./consolidate";

function item(
  id: string,
  name: string,
  amount: number | null,
  unit: string | null,
  recipeRef = "Rezept A",
  checked = false,
) {
  return { id, name, amount, unit, recipeRef, checked };
}

describe("consolidateList", () => {
  it("returns empty array for empty input", () => {
    expect(consolidateList([])).toEqual([]);
  });

  it("single item passes through unchanged", () => {
    const result = consolidateList([item("1", "Mehl", 500, "g")]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Mehl");
    expect(result[0].totalAmount).toBe(500);
    expect(result[0].unit).toBe("g");
    expect(result[0].totalLabel).toBe("500 g");
  });

  it("merges same ingredient in same unit", () => {
    const result = consolidateList([
      item("1", "Mehl", 500, "g", "Kuchen"),
      item("2", "Mehl", 300, "g", "Brot"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe(800);
    expect(result[0].unit).toBe("g");
    expect(result[0].items).toHaveLength(2);
  });

  it("converts g + kg → kg when ≥ 1000 g", () => {
    const result = consolidateList([
      item("1", "Mehl", 500, "g"),
      item("2", "Mehl", 1, "kg"),
    ]);
    expect(result[0].totalAmount).toBeCloseTo(1.5);
    expect(result[0].unit).toBe("kg");
  });

  it("merges ml + l correctly", () => {
    const result = consolidateList([
      item("1", "Milch", 500, "ml"),
      item("2", "Milch", 1, "l"),
    ]);
    expect(result[0].totalAmount).toBeCloseTo(1.5);
    expect(result[0].unit).toBe("l");
  });

  it("groups case-insensitively but preserves original case", () => {
    const result = consolidateList([
      item("1", "Butter", 100, "g"),
      item("2", "butter", 100, "g"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Butter"); // first occurrence
    expect(result[0].totalAmount).toBe(200);
  });

  it("keeps incompatible units separate via null total", () => {
    const result = consolidateList([
      item("1", "Ei", 2, "Stk"),
      item("2", "Ei", 100, "g"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBeNull();
    expect(result[0].unit).toBeNull();
  });

  it("separates different ingredients", () => {
    const result = consolidateList([
      item("1", "Mehl", 200, "g"),
      item("2", "Zucker", 100, "g"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("allChecked / someChecked flags work correctly", () => {
    const result = consolidateList([
      item("1", "Mehl", 200, "g", "A", true),
      item("2", "Mehl", 100, "g", "B", false),
    ]);
    expect(result[0].allChecked).toBe(false);
    expect(result[0].someChecked).toBe(true);
  });

  it("handles null amounts", () => {
    const result = consolidateList([item("1", "Salz", null, null)]);
    expect(result[0].totalAmount).toBeNull();
    expect(result[0].totalLabel).toBe("");
  });

  it("preserves insertion order", () => {
    const result = consolidateList([
      item("1", "Zucker", 100, "g"),
      item("2", "Mehl", 200, "g"),
      item("3", "Butter", 50, "g"),
    ]);
    expect(result.map((g) => g.name)).toEqual(["Zucker", "Mehl", "Butter"]);
  });
});
