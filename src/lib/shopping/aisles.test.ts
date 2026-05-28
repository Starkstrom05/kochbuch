import { describe, it, expect } from "vitest";
import { groupByAisle } from "./aisles";
import type { ConsolidatedGroup } from "./consolidate";

function group(name: string, category: string | null, allChecked = false): ConsolidatedGroup {
  return {
    name,
    totalAmount: null,
    unit: null,
    totalLabel: "",
    items: [{ id: name, name, amount: null, unit: null, recipeRef: null, checked: allChecked }],
    allChecked,
    someChecked: allChecked,
    category,
  };
}

describe("groupByAisle", () => {
  it("returns empty for empty input", () => {
    expect(groupByAisle([])).toEqual([]);
  });

  it("orders known aisles by store-walk order, not insertion order", () => {
    const sections = groupByAisle([
      group("Mehl", "Trockenwaren"),
      group("Apfel", "Obst"),
      group("Milch", "Kuehlregal"),
    ]);
    expect(sections.map((s) => s.label)).toEqual(["Obst", "Kühlregal", "Trockenwaren"]);
  });

  it("uses display labels with umlauts for ascii category keys", () => {
    const sections = groupByAisle([group("Zwiebel", "Gemuese"), group("Salz", "Gewuerze")]);
    expect(sections.map((s) => s.label)).toEqual(["Gemüse", "Gewürze"]);
  });

  it("puts uncategorised groups into Sonstiges at the bottom", () => {
    const sections = groupByAisle([group("Zahnpasta", null), group("Apfel", "Obst")]);
    expect(sections.map((s) => s.label)).toEqual(["Obst", "Sonstiges"]);
    expect(sections[1].category).toBeNull();
  });

  it("appends unknown categories alphabetically before Sonstiges", () => {
    const sections = groupByAisle([
      group("X", null),
      group("Y", "Zubehoer"),
      group("Z", "Aktion"),
      group("A", "Obst"),
    ]);
    expect(sections.map((s) => s.label)).toEqual(["Obst", "Aktion", "Zubehoer", "Sonstiges"]);
  });

  it("groups multiple items under the same aisle", () => {
    const sections = groupByAisle([
      group("Apfel", "Obst"),
      group("Banane", "Obst"),
      group("Milch", "Kuehlregal"),
    ]);
    const obst = sections.find((s) => s.category === "Obst");
    expect(obst?.groups.map((g) => g.name)).toEqual(["Apfel", "Banane"]);
  });

  it("sinks fully-checked groups to the bottom within an aisle", () => {
    const sections = groupByAisle([group("Apfel", "Obst", true), group("Banane", "Obst", false)]);
    const obst = sections.find((s) => s.category === "Obst")!;
    expect(obst.groups.map((g) => g.name)).toEqual(["Banane", "Apfel"]);
  });
});
