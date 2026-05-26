import { classify, fromBaseAmount, normaliseUnit, toBaseAmount } from "@/lib/units/units";

const SMART_MASS = new Set(["g", "kg"]);
const SMART_VOLUME = new Set(["ml", "cl", "l"]);

function formatNumberEnglish(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Formatiert (amount, unit) als value-String für die OurGroceries-API:
 * - Dezimaltrennung: Punkt (1.5), nicht Komma (1,5)
 * - Smart-Skalierung nur bei g/kg und ml/cl/l (z.B. 1500 g → "1.5 kg",
 *   0.5 l → "500 ml"). EL/TL/Tasse/Prise/Stk bleiben unverändert,
 *   weil die Original-Einheit semantisch wertvoller ist als die ml-Umrechnung.
 */
export function formatAmountForExport(
  amount: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (amount == null || !Number.isFinite(amount)) return "";

  const normalised = normaliseUnit(unit ?? "");

  if (normalised && (SMART_MASS.has(normalised) || SMART_VOLUME.has(normalised))) {
    const cls = classify(normalised);
    if (cls === "mass" || cls === "volume") {
      const base = toBaseAmount(amount, normalised);
      const nice = fromBaseAmount(base.amount, base.base);
      return `${formatNumberEnglish(nice.amount)} ${nice.unit}`;
    }
  }

  const numStr = formatNumberEnglish(amount);
  return normalised ? `${numStr} ${normalised}` : numStr;
}
