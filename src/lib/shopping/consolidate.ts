import { addAmounts, normaliseUnit } from "@/lib/units/units";
import { formatAmount } from "@/lib/units/fraction";

export type RawItem = {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  recipeRef: string | null;
  checked: boolean;
  /** Gang/Aisle aus Ingredient.category, zur Lesezeit angereichert. */
  category?: string | null;
  /** Freitext-Notiz pro Item (z. B. „welche Marke"). */
  note?: string | null;
};

export type ConsolidatedGroup = {
  /** Display name (original casing from first item) */
  name: string;
  /** Null if amounts couldn't be merged (incompatible units) */
  totalAmount: number | null;
  unit: string | null;
  /** Human-readable total, e.g. "800 g" or "2 Stk" */
  totalLabel: string;
  items: RawItem[];
  allChecked: boolean;
  someChecked: boolean;
  /** Gang/Aisle (erstes Item mit Kategorie gewinnt), null = ohne Kategorie. */
  category: string | null;
};

export function consolidateList(items: RawItem[]): ConsolidatedGroup[] {
  if (items.length === 0) return [];

  // Group by normalised name (preserve original casing via first occurrence)
  const order: string[] = [];
  const groups = new Map<string, RawItem[]>();

  for (const item of items) {
    const key = item.name.toLowerCase().trim();
    if (!groups.has(key)) {
      order.push(key);
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }

  return order.map((key) => {
    const groupItems = groups.get(key)!;

    // Try to sum amounts
    let acc: { amount: number | null; unit: string | null } = {
      amount: groupItems[0].amount,
      unit: normaliseUnit(groupItems[0].unit ?? "") || null,
    };
    let canSum = true;

    for (let i = 1; i < groupItems.length; i++) {
      const { amount, unit } = groupItems[i];
      const combined = addAmounts(acc, {
        amount,
        unit: normaliseUnit(unit ?? "") || null,
      });
      if (combined === null) {
        canSum = false;
        break;
      }
      acc = combined;
    }

    const totalAmount = canSum ? acc.amount : null;
    const unit = canSum ? acc.unit : null;

    const totalLabel = buildLabel(canSum ? totalAmount : null, unit, groupItems, canSum);

    return {
      name: groupItems[0].name,
      totalAmount,
      unit,
      totalLabel,
      items: groupItems,
      allChecked: groupItems.every((i) => i.checked),
      someChecked: groupItems.some((i) => i.checked),
      category: groupItems.find((i) => i.category)?.category ?? null,
    };
  });
}

/**
 * Stable sort that pushes fully-checked groups to the bottom while keeping the
 * relative order of everything else (insertion order from consolidateList).
 */
export function sortConsolidatedGroups(groups: ConsolidatedGroup[]): ConsolidatedGroup[] {
  return [...groups].sort((a, b) => Number(a.allChecked) - Number(b.allChecked));
}

function buildLabel(
  total: number | null,
  unit: string | null,
  groupItems: RawItem[],
  canSum: boolean,
): string {
  if (!canSum) {
    // Show each part individually
    return groupItems
      .map((i) => (i.amount != null ? `${formatAmount(i.amount)} ${i.unit ?? ""}`.trim() : ""))
      .filter(Boolean)
      .join(" + ");
  }
  if (total == null) return "";
  return `${formatAmount(total)}${unit ? " " + unit : ""}`;
}
