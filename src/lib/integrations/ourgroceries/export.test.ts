import { describe, expect, it } from "vitest";
import type { ConsolidatedGroup } from "@/lib/shopping/consolidate";
import { buildOurGroceriesCsv, buildOurGroceriesItems } from "./export";

function grp(over: Partial<ConsolidatedGroup>): ConsolidatedGroup {
  return {
    name: "Item",
    totalAmount: null,
    unit: null,
    totalLabel: "",
    items: [],
    allChecked: false,
    someChecked: false,
    category: null,
    ...over,
  };
}

describe("buildOurGroceriesItems", () => {
  it("filters fully-checked groups", () => {
    const items = buildOurGroceriesItems([
      { group: grp({ name: "Done", allChecked: true }), ingredientCategory: null },
      { group: grp({ name: "Todo" }), ingredientCategory: null },
    ]);
    expect(items.map((i) => i.name)).toEqual(["Todo"]);
  });

  it("maps ingredient category to OG aisle", () => {
    const items = buildOurGroceriesItems([
      { group: grp({ name: "Tomate" }), ingredientCategory: "Gemuese" },
      { group: grp({ name: "Milch" }), ingredientCategory: "Kuehlregal" },
    ]);
    expect(items.map((i) => i.aisle)).toEqual(["Produce", "Dairy"]);
  });

  it("formats amount in english style", () => {
    const items = buildOurGroceriesItems([
      {
        group: grp({ name: "Mehl", totalAmount: 1500, unit: "g", totalLabel: "1,5 kg" }),
        ingredientCategory: null,
      },
    ]);
    expect(items[0].amountLabel).toBe("1.5 kg");
  });

  it("falls back to the consolidation label when amounts are incompatible", () => {
    const items = buildOurGroceriesItems([
      {
        group: grp({
          name: "Mehl",
          totalAmount: null,
          unit: null,
          totalLabel: "500 g + 2 EL",
        }),
        ingredientCategory: null,
      },
    ]);
    expect(items[0].amountLabel).toBe("500 g + 2 EL");
  });

  it("joins unique recipe sources into a note", () => {
    const items = buildOurGroceriesItems([
      {
        group: grp({
          name: "Salz",
          items: [
            { id: "1", name: "Salz", amount: null, unit: null, recipeRef: "Pasta", checked: false },
            { id: "2", name: "Salz", amount: null, unit: null, recipeRef: "Pasta", checked: false },
            { id: "3", name: "Salz", amount: null, unit: null, recipeRef: "Brot", checked: false },
          ],
        }),
        ingredientCategory: null,
      },
    ]);
    expect(items[0].note).toBe("Pasta, Brot");
  });
});

describe("buildOurGroceriesCsv", () => {
  it("emits header + escaped rows in OG-import format", () => {
    const csv = buildOurGroceriesCsv([
      { name: "Tomate", amountLabel: "500 g", aisle: "Produce", note: null },
      { name: "Käse, Reibe", amountLabel: "200 g", aisle: "Dairy", note: 'mit "Bio"-Label' },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("name,category,quantity,note");
    expect(lines[1]).toBe("Tomate,Produce,500 g,");
    expect(lines[2]).toBe('"Käse, Reibe",Dairy,200 g,"mit ""Bio""-Label"');
    expect(lines[3]).toBe("");
  });
});
