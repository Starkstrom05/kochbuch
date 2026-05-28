import { describe, it, expect } from "vitest";
import { planManualMerge, type ExistingItem } from "./merge";

function existing(
  id: string,
  name: string,
  amount: number | null,
  unit: string | null,
  checked = false,
): ExistingItem {
  return { id, name, amount, unit, checked };
}

describe("planManualMerge", () => {
  it("creates when list is empty", () => {
    expect(planManualMerge([], { name: "Milch", amount: 500, unit: "ml" })).toEqual({
      kind: "create",
    });
  });

  it("creates when no name matches", () => {
    const list = [existing("a", "Mehl", 500, "g")];
    expect(planManualMerge(list, { name: "Milch", amount: 1, unit: "l" })).toEqual({
      kind: "create",
    });
  });

  it("merges same name + same unit", () => {
    const list = [existing("a", "Milch", 500, "ml")];
    expect(planManualMerge(list, { name: "Milch", amount: 250, unit: "ml" })).toEqual({
      kind: "merge",
      targetId: "a",
      amount: 750,
      unit: "ml",
    });
  });

  it("matches case-insensitively and trims", () => {
    const list = [existing("a", "Milch", 1, "l")];
    const plan = planManualMerge(list, { name: "  milch ", amount: 500, unit: "ml" });
    expect(plan).toMatchObject({ kind: "merge", targetId: "a" });
  });

  it("converts compatible units when merging (l + ml)", () => {
    const list = [existing("a", "Milch", 1, "l")];
    const plan = planManualMerge(list, { name: "Milch", amount: 500, unit: "ml" });
    // 1 l + 500 ml = 1.5 l
    expect(plan).toMatchObject({ kind: "merge", targetId: "a", amount: 1.5, unit: "l" });
  });

  it("creates a new item for incompatible units", () => {
    const list = [existing("a", "Zwiebel", 2, "Stk")];
    expect(planManualMerge(list, { name: "Zwiebel", amount: 100, unit: "g" })).toEqual({
      kind: "create",
    });
  });

  it("ignores checked items and creates instead", () => {
    const list = [existing("a", "Milch", 500, "ml", true)];
    expect(planManualMerge(list, { name: "Milch", amount: 250, unit: "ml" })).toEqual({
      kind: "create",
    });
  });

  it("merges into the first unchecked match, skipping checked duplicates", () => {
    const list = [
      existing("a", "Milch", 500, "ml", true),
      existing("b", "Milch", 200, "ml", false),
    ];
    expect(planManualMerge(list, { name: "Milch", amount: 300, unit: "ml" })).toMatchObject({
      kind: "merge",
      targetId: "b",
      amount: 500,
    });
  });

  it("merges amountless items into one (e.g. Salz + Salz)", () => {
    const list = [existing("a", "Salz", null, null)];
    expect(planManualMerge(list, { name: "Salz", amount: null, unit: null })).toMatchObject({
      kind: "merge",
      targetId: "a",
      amount: null,
    });
  });
});
