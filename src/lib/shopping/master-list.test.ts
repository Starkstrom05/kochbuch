import { describe, it, expect } from "vitest";
import { selectMasterListItems, type FrequentEntry } from "./master-list";

function entry(name: string, count: number, unit: string | null = null): FrequentEntry {
  return { name, unit, count };
}

describe("selectMasterListItems", () => {
  it("returns empty for empty input", () => {
    expect(selectMasterListItems([], [])).toEqual([]);
  });

  it("keeps server order (no re-sorting)", () => {
    const freq = [entry("Milch", 10), entry("Brot", 8), entry("Eier", 5)];
    expect(selectMasterListItems(freq, []).map((f) => f.name)).toEqual(["Milch", "Brot", "Eier"]);
  });

  it("filters out items already on the list (case-insensitive)", () => {
    const freq = [entry("Milch", 10), entry("Brot", 8)];
    expect(selectMasterListItems(freq, ["  milch "]).map((f) => f.name)).toEqual(["Brot"]);
  });

  it("filters regardless of checked state (caller passes all names)", () => {
    const freq = [entry("Milch", 10), entry("Brot", 8), entry("Eier", 5)];
    expect(selectMasterListItems(freq, ["Milch", "Eier"]).map((f) => f.name)).toEqual(["Brot"]);
  });

  it("caps to the limit", () => {
    const freq = Array.from({ length: 20 }, (_, i) => entry(`Item${i}`, 20 - i));
    expect(selectMasterListItems(freq, [], 5)).toHaveLength(5);
  });

  it("counts limit after filtering, not before", () => {
    const freq = [entry("A", 5), entry("B", 4), entry("C", 3), entry("D", 2)];
    // A on list → B, C fill the limit of 2
    expect(selectMasterListItems(freq, ["A"], 2).map((f) => f.name)).toEqual(["B", "C"]);
  });

  it("preserves the unit for re-add convenience", () => {
    const freq = [entry("Milch", 10, "l")];
    expect(selectMasterListItems(freq, [])[0].unit).toBe("l");
  });
});
