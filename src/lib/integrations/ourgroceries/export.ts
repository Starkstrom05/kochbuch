import type { ConsolidatedGroup } from "@/lib/shopping/consolidate";
import { formatAmountForExport } from "./format";
import { mapCategoryToAisle } from "./category-map";
import type { OurGroceriesItem } from "./client";

export type ItemSource = {
  group: ConsolidatedGroup;
  ingredientCategory: string | null;
};

/**
 * Baut aus den Kochbuch-Konsolidierungsgruppen die fuer den OurGroceries-Pfad
 * benoetigten Item-Objekte. Filtert komplett-abgehakte Gruppen aus.
 */
export function buildOurGroceriesItems(sources: ItemSource[]): OurGroceriesItem[] {
  return sources
    .filter(({ group }) => !group.allChecked)
    .map(({ group, ingredientCategory }) => {
      const amountLabel = group.totalLabel
        ? formatAmountForExport(group.totalAmount, group.unit) ||
          // Fallback: kein numerischer Gesamtwert vorhanden, dann den
          // Konsolidierungs-Label (z.B. "500 g + 2 EL") roh durchreichen.
          group.totalLabel
        : "";

      const recipeNotes = uniqueRecipeRefs(group);

      return {
        name: group.name,
        amountLabel: amountLabel || undefined,
        aisle: mapCategoryToAisle(ingredientCategory),
        note: recipeNotes.length > 0 ? recipeNotes.join(", ") : null,
      };
    });
}

function uniqueRecipeRefs(group: ConsolidatedGroup): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of group.items) {
    if (item.recipeRef && !seen.has(item.recipeRef)) {
      seen.add(item.recipeRef);
      out.push(item.recipeRef);
    }
  }
  return out;
}

/**
 * Baut CSV-Inhalt im OurGroceries-Import-Format: name,category,quantity,note
 * (eine Header-Zeile + ein Item pro Zeile). RFC-4180-kompatibles Quoting.
 */
export function buildOurGroceriesCsv(items: OurGroceriesItem[]): string {
  const header = ["name", "category", "quantity", "note"];
  const rows = items.map((it) => [it.name, it.aisle ?? "", it.amountLabel ?? "", it.note ?? ""]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n") + "\r\n";
}

// Feldwerte stammen aus user-kontrollierten Zutaten-/Rezeptnamen. Ein Name
// wie "=1+1" oder "@SUM(...)" wuerde beim CSV-Import in Excel/Sheets/OG als
// Formel statt als Text interpretiert (Formula-Injection) — daher fuehrende
// Formel-Praefixe mit einem harmlosen Apostroph neutralisieren, bevor
// RFC-4180-Quoting greift.
const FORMULA_PREFIX = /^[=+\-@]/;

function neutraliseFormulaPrefix(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function escapeCsv(value: string): string {
  const safe = neutraliseFormulaPrefix(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}
