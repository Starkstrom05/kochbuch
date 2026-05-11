import { describe, it, expect } from "vitest";
import { formatAmount, scaleAmount } from "./fraction";

describe("formatAmount", () => {
  it("rendert ganze Zahlen ohne Bruch", () => {
    expect(formatAmount(1)).toBe("1");
    expect(formatAmount(500)).toBe("500");
  });

  it("nutzt Unicode-Brueche fuer haeufige Werte", () => {
    expect(formatAmount(0.5)).toBe("½");
    expect(formatAmount(0.25)).toBe("¼");
    expect(formatAmount(0.75)).toBe("¾");
    expect(formatAmount(0.333)).toBe("⅓");
  });

  it("kombiniert Ganzzahl + Bruch", () => {
    expect(formatAmount(1.5)).toBe("1½");
    expect(formatAmount(2.25)).toBe("2¼");
  });

  it("rundet 0.99+ auf die naechste Ganzzahl", () => {
    expect(formatAmount(1.995)).toBe("2");
  });

  it("nutzt Dezimal-Fallback wenn kein huebscher Bruch passt", () => {
    // 1.44 hat keinen passenden Bruch innerhalb der 0.05-Toleranz
    expect(formatAmount(1.44)).toMatch(/^1,\d+$/);
  });

  it("ignoriert leere/ungueltige Werte", () => {
    expect(formatAmount(null)).toBe("");
    expect(formatAmount(undefined)).toBe("");
    expect(formatAmount(0)).toBe("0");
  });
});

describe("scaleAmount", () => {
  it("skaliert linear", () => {
    expect(scaleAmount(100, 4, 8)).toBe(200);
    expect(scaleAmount(500, 4, 2)).toBe(250);
  });

  it("handhabt null-Mengen (z.B. 'eine Prise')", () => {
    expect(scaleAmount(null, 4, 8)).toBeNull();
  });

  it("ignoriert ungueltige Portionsangaben", () => {
    expect(scaleAmount(100, 0, 4)).toBe(100);
    expect(scaleAmount(100, 4, 0)).toBe(100);
  });
});
