import { describe, it, expect } from "vitest";
import { scaleIngredient, renderIngredient } from "./scale";

describe("scaleIngredient", () => {
  it("doubles the amount when servings double", () => {
    const out = scaleIngredient({ name: "Mehl", amount: 200, unit: "g" }, 2, 4);
    expect(out.amount).toBe(400);
  });

  it("halves the amount when servings halve", () => {
    const out = scaleIngredient({ name: "Mehl", amount: 200, unit: "g" }, 4, 2);
    expect(out.amount).toBe(100);
  });

  it("leaves the unit untouched (no auto-conversion)", () => {
    const out = scaleIngredient({ name: "Mehl", amount: 1000, unit: "g" }, 1, 2);
    expect(out.unit).toBe("g");
  });

  it("keeps amount null when input is null", () => {
    const out = scaleIngredient(
      { name: "Salz", amount: null, unit: "", note: "nach Geschmack" },
      4,
      8,
    );
    expect(out.amount).toBeNull();
    expect(out.note).toBe("nach Geschmack");
  });

  it("preserves the name and other fields", () => {
    const out = scaleIngredient({ name: "Eier", amount: 2, unit: "Stück", note: "Größe M" }, 4, 6);
    expect(out.name).toBe("Eier");
    expect(out.note).toBe("Größe M");
  });
});

describe("renderIngredient", () => {
  it("joins amount, unit and name with single spaces", () => {
    expect(renderIngredient({ name: "Mehl", amount: 200, unit: "g" })).toBe("200 g Mehl");
  });

  it("omits the amount segment when null", () => {
    expect(renderIngredient({ name: "Salz", amount: null, unit: "" })).toBe("Salz");
  });

  it("omits the unit segment when empty or unrecognised", () => {
    expect(renderIngredient({ name: "Eier", amount: 2, unit: "" })).toBe("2 Eier");
  });

  it("appends notes after a comma", () => {
    expect(renderIngredient({ name: "Salz", amount: null, unit: "", note: "nach Geschmack" })).toBe(
      "Salz, nach Geschmack",
    );
  });

  it("formats fractional amounts via formatAmount (½, ¼, …)", () => {
    // formatAmount converts 0.5 → "½" — guard against an accidental change.
    const out = renderIngredient({ name: "Sahne", amount: 0.5, unit: "l" });
    expect(out.startsWith("½")).toBe(true);
  });
});
