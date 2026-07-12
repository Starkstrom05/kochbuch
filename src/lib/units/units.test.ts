import { describe, it, expect } from "vitest";
import { addAmounts, classify, fromBaseAmount, normaliseUnit, toBaseAmount } from "./units";

describe("normaliseUnit", () => {
  it("normalisiert deutsche Ausdruecke", () => {
    expect(normaliseUnit("Gramm")).toBe("g");
    expect(normaliseUnit("kilogramm")).toBe("kg");
    expect(normaliseUnit("Esslöffel")).toBe("EL");
    expect(normaliseUnit("Stk.")).toBe("Stk");
  });

  it("laesst unbekannte Einheiten unveraendert", () => {
    expect(normaliseUnit("Glas")).toBe("Glas");
  });

  it("behandelt leere Werte", () => {
    expect(normaliseUnit(null)).toBe("");
    expect(normaliseUnit(undefined)).toBe("");
  });

  it("normalisiert Kurz-Einheiten case-insensitiv", () => {
    expect(normaliseUnit("G")).toBe("g");
    expect(normaliseUnit("KG")).toBe("kg");
    expect(normaliseUnit("ML")).toBe("ml");
    expect(normaliseUnit("L")).toBe("l");
    expect(normaliseUnit("Cl")).toBe("cl");
    expect(normaliseUnit("EL")).toBe("EL");
    expect(normaliseUnit("el")).toBe("EL");
    expect(normaliseUnit("Tl")).toBe("TL");
    expect(normaliseUnit("TASSE")).toBe("Tasse");
    expect(normaliseUnit("PRISE")).toBe("Prise");
  });
});

describe("classify", () => {
  it("erkennt Klassen", () => {
    expect(classify("g")).toBe("mass");
    expect(classify("kg")).toBe("mass");
    expect(classify("ml")).toBe("volume");
    expect(classify("EL")).toBe("volume");
    expect(classify("Stk")).toBe("count");
    expect(classify("Glas")).toBe("other");
  });
});

describe("toBaseAmount / fromBaseAmount", () => {
  it("konvertiert in Basiseinheit", () => {
    expect(toBaseAmount(1, "kg")).toEqual({ amount: 1000, base: "g" });
    expect(toBaseAmount(2, "EL")).toEqual({ amount: 30, base: "ml" });
  });

  it("schaltet auf groessere Einheit zurueck", () => {
    expect(fromBaseAmount(1500, "g")).toEqual({ amount: 1.5, unit: "kg" });
    expect(fromBaseAmount(250, "ml")).toEqual({ amount: 250, unit: "ml" });
  });
});

describe("addAmounts", () => {
  it("addiert kompatible Mengen", () => {
    expect(addAmounts({ amount: 500, unit: "g" }, { amount: 500, unit: "g" })).toEqual({
      amount: 1,
      unit: "kg",
    });
  });

  it("konvertiert beim Addieren zwischen kg und g", () => {
    expect(addAmounts({ amount: 1, unit: "kg" }, { amount: 200, unit: "g" })).toEqual({
      amount: 1.2,
      unit: "kg",
    });
  });

  it("gibt null bei inkompatiblen Einheiten", () => {
    expect(addAmounts({ amount: 1, unit: "g" }, { amount: 1, unit: "Stk" })).toBeNull();
  });

  it("uebernimmt eine null-Menge", () => {
    expect(addAmounts({ amount: null, unit: "Prise" }, { amount: 5, unit: "g" })).toEqual({
      amount: 5,
      unit: "g",
    });
  });

  it("addiert gleiche unbekannte Einheiten", () => {
    expect(addAmounts({ amount: 2, unit: "Glas" }, { amount: 1, unit: "Glas" })).toEqual({
      amount: 3,
      unit: "Glas",
    });
  });

  it("behaelt Kuechen-Einheiten bei gleicher Einheit statt zu ml zu degradieren", () => {
    expect(addAmounts({ amount: 2, unit: "EL" }, { amount: 1, unit: "EL" })).toEqual({
      amount: 3,
      unit: "EL",
    });
    expect(addAmounts({ amount: 1, unit: "TL" }, { amount: 1, unit: "TL" })).toEqual({
      amount: 2,
      unit: "TL",
    });
    expect(addAmounts({ amount: 1, unit: "Prise" }, { amount: 1, unit: "Prise" })).toEqual({
      amount: 2,
      unit: "Prise",
    });
    expect(addAmounts({ amount: 1, unit: "Tasse" }, { amount: 1, unit: "Tasse" })).toEqual({
      amount: 2,
      unit: "Tasse",
    });
  });

  it("bleibt bei gleichen Basis-Einheiten korrekt (g/kg/ml/l)", () => {
    expect(addAmounts({ amount: 500, unit: "g" }, { amount: 500, unit: "g" })).toEqual({
      amount: 1,
      unit: "kg",
    });
    expect(addAmounts({ amount: 1, unit: "kg" }, { amount: 1, unit: "kg" })).toEqual({
      amount: 2,
      unit: "kg",
    });
    expect(addAmounts({ amount: 600, unit: "ml" }, { amount: 600, unit: "ml" })).toEqual({
      amount: 1.2,
      unit: "l",
    });
    expect(addAmounts({ amount: 1, unit: "l" }, { amount: 1, unit: "l" })).toEqual({
      amount: 2,
      unit: "l",
    });
  });

  it("merged gleiche Kurz-Einheiten unabhaengig von Gross-/Kleinschreibung", () => {
    expect(addAmounts({ amount: 500, unit: "G" }, { amount: 500, unit: "g" })).toEqual({
      amount: 1,
      unit: "kg",
    });
    expect(addAmounts({ amount: 2, unit: "el" }, { amount: 1, unit: "EL" })).toEqual({
      amount: 3,
      unit: "EL",
    });
  });
});
