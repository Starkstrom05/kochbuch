import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/prisma", () => {
  const shoppingItem = { findMany: vi.fn() };
  const ingredient = { findMany: vi.fn() };
  return { prisma: { shoppingItem, ingredient } };
});

import { prisma } from "@/lib/db/prisma";
import { loadExportItemsForList } from "./service";

const sItem = prisma.shoppingItem.findMany as ReturnType<typeof vi.fn>;
const sIngredient = prisma.ingredient.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  sItem.mockReset();
  sIngredient.mockReset();
});

describe("loadExportItemsForList", () => {
  it("returns empty array for empty list", async () => {
    sItem.mockResolvedValue([]);
    const items = await loadExportItemsForList("L1");
    expect(items).toEqual([]);
    expect(sIngredient).not.toHaveBeenCalled();
  });

  it("joins ingredient categories case-insensitively and skips checked groups", async () => {
    sItem.mockResolvedValue([
      { id: "a", name: "Tomate", amount: 500, unit: "g", recipeRef: "Pasta", checked: false },
      { id: "b", name: "tomate", amount: 200, unit: "g", recipeRef: "Salat", checked: false },
      { id: "c", name: "Mehl", amount: 1000, unit: "g", recipeRef: null, checked: true },
      { id: "d", name: "Salz", amount: null, unit: null, recipeRef: null, checked: false },
    ]);
    sIngredient.mockResolvedValue([
      { name: "Tomate", category: "Gemuese" },
      { name: "Mehl", category: "Trockenwaren" },
      { name: "Salz", category: null },
    ]);

    const items = await loadExportItemsForList("L1");

    expect(items.map((i) => i.name)).toEqual(["Tomate", "Salz"]);
    const tomate = items.find((i) => i.name === "Tomate")!;
    expect(tomate.aisle).toBe("Produce");
    expect(tomate.amountLabel).toBe("700 g");
    expect(tomate.note).toBe("Pasta, Salat");

    const salz = items.find((i) => i.name === "Salz")!;
    expect(salz.aisle).toBeNull();
    expect(salz.amountLabel).toBeUndefined();
  });
});
