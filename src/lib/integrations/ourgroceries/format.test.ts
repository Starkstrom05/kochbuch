import { describe, expect, it } from "vitest";
import { formatAmountForExport } from "./format";

describe("formatAmountForExport", () => {
  it("returns empty string when amount is null", () => {
    expect(formatAmountForExport(null, "kg")).toBe("");
    expect(formatAmountForExport(undefined, "kg")).toBe("");
  });

  it("returns the number alone when unit is missing", () => {
    expect(formatAmountForExport(3, null)).toBe("3");
    expect(formatAmountForExport(2.5, "")).toBe("2.5");
  });

  it("uses english decimal point, not comma", () => {
    expect(formatAmountForExport(1.5, "kg")).toBe("1.5 kg");
    expect(formatAmountForExport(1.25, "kg")).toBe("1.25 kg");
  });

  it("smart-scales grams into kilograms above 1000 g", () => {
    expect(formatAmountForExport(1500, "g")).toBe("1.5 kg");
    expect(formatAmountForExport(2000, "g")).toBe("2 kg");
    expect(formatAmountForExport(999, "g")).toBe("999 g");
  });

  it("smart-scales litres down to ml below 1 l", () => {
    expect(formatAmountForExport(0.5, "l")).toBe("500 ml");
    expect(formatAmountForExport(0.25, "l")).toBe("250 ml");
    expect(formatAmountForExport(2, "l")).toBe("2 l");
  });

  it("normalises long-form units (gramm → g, esslöffel → EL)", () => {
    expect(formatAmountForExport(500, "gramm")).toBe("500 g");
    expect(formatAmountForExport(2, "esslöffel")).toBe("2 EL");
  });

  it("does NOT skip-convert EL/TL/Tasse — those stay as-is", () => {
    expect(formatAmountForExport(2, "EL")).toBe("2 EL");
    expect(formatAmountForExport(1.5, "TL")).toBe("1.5 TL");
    expect(formatAmountForExport(1, "Tasse")).toBe("1 Tasse");
  });

  it("handles count-style units unchanged", () => {
    expect(formatAmountForExport(3, "Stk")).toBe("3 Stk");
    expect(formatAmountForExport(2, "Bund")).toBe("2 Bund");
  });

  it("strips trailing zeros (1.50 → 1.5, 1.00 → 1)", () => {
    expect(formatAmountForExport(1, "kg")).toBe("1 kg");
    expect(formatAmountForExport(1.5, "kg")).toBe("1.5 kg");
    expect(formatAmountForExport(1.1, "kg")).toBe("1.1 kg");
  });

  it("rounds to at most 2 decimals", () => {
    expect(formatAmountForExport(1.234, "kg")).toBe("1.23 kg");
    expect(formatAmountForExport(1.236, "kg")).toBe("1.24 kg");
  });
});
