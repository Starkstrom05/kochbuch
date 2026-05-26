import { describe, expect, it } from "vitest";
import { mapCategoryToAisle } from "./category-map";

describe("mapCategoryToAisle", () => {
  it("maps known DE categories to english aisles", () => {
    expect(mapCategoryToAisle("Gemuese")).toBe("Produce");
    expect(mapCategoryToAisle("Gemüse")).toBe("Produce");
    expect(mapCategoryToAisle("Kuehlregal")).toBe("Dairy");
    expect(mapCategoryToAisle("Trockenwaren")).toBe("Dry Goods");
  });

  it("falls back to the raw category for unknown values", () => {
    expect(mapCategoryToAisle("Eigene Kategorie")).toBe("Eigene Kategorie");
  });

  it("returns null for empty input", () => {
    expect(mapCategoryToAisle(null)).toBeNull();
    expect(mapCategoryToAisle(undefined)).toBeNull();
    expect(mapCategoryToAisle("   ")).toBeNull();
  });
});
