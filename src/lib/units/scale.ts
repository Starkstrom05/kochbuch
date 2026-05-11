import { formatAmount, scaleAmount } from "./fraction";
import { normaliseUnit } from "./units";

export type ScalableIngredient = {
  amount: number | null;
  unit: string | null;
  name: string;
  note?: string | null;
};

export function scaleIngredient(
  ing: ScalableIngredient,
  fromServings: number,
  toServings: number,
): ScalableIngredient {
  return {
    ...ing,
    amount: scaleAmount(ing.amount, fromServings, toServings),
    unit: ing.unit,
  };
}

export function renderIngredient(ing: ScalableIngredient): string {
  const parts: string[] = [];
  const amount = formatAmount(ing.amount);
  if (amount) parts.push(amount);
  const unit = normaliseUnit(ing.unit ?? "");
  if (unit) parts.push(unit);
  parts.push(ing.name);
  let out = parts.join(" ");
  if (ing.note) out += `, ${ing.note}`;
  return out;
}
