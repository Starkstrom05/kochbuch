import { sortConsolidatedGroups, type ConsolidatedGroup } from "./consolidate";

export type AisleSection = {
  /** Roh-Kategorie aus Ingredient.category (null = ohne Kategorie). */
  category: string | null;
  /** Anzeige-Label (mit Umlauten; category ist ASCII gespeichert). */
  label: string;
  groups: ConsolidatedGroup[];
};

/**
 * Reihenfolge entspricht einem typischen Lauf durch den Supermarkt
 * (Frische zuerst, Haltbares später). Keys sind die ASCII-Werte aus der
 * Ingredient-Tabelle, Labels die Anzeige-Form.
 */
const AISLE_ORDER: { key: string; label: string }[] = [
  { key: "Obst", label: "Obst" },
  { key: "Gemuese", label: "Gemüse" },
  { key: "Kuehlregal", label: "Kühlregal" },
  { key: "Fleisch", label: "Fleisch" },
  { key: "Fisch", label: "Fisch" },
  { key: "Backen", label: "Backen" },
  { key: "Trockenwaren", label: "Trockenwaren" },
  { key: "Gewuerze", label: "Gewürze" },
  { key: "Vorrat", label: "Vorrat" },
];

const UNCATEGORISED_LABEL = "Sonstiges";

/**
 * Gruppiert konsolidierte Gruppen nach Gang. Bekannte Gänge in fester
 * Reihenfolge, unbekannte Kategorien alphabetisch dahinter, Items ohne
 * Kategorie als "Sonstiges" ganz unten. Innerhalb jedes Gangs sinken
 * abgehakte Gruppen nach unten (sortConsolidatedGroups). Leere Gänge
 * erscheinen nicht.
 */
export function groupByAisle(groups: ConsolidatedGroup[]): AisleSection[] {
  const knownOrder = new Map(AISLE_ORDER.map((a, i) => [a.key, i]));
  const buckets = new Map<string | null, ConsolidatedGroup[]>();
  const unknownKeys: string[] = [];

  for (const g of groups) {
    const key = g.category ?? null;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      if (key !== null && !knownOrder.has(key)) unknownKeys.push(key);
    }
    buckets.get(key)!.push(g);
  }

  const sections: AisleSection[] = [];

  for (const a of AISLE_ORDER) {
    const gs = buckets.get(a.key);
    if (gs) sections.push({ category: a.key, label: a.label, groups: sortConsolidatedGroups(gs) });
  }

  for (const key of unknownKeys.sort((a, b) => a.localeCompare(b, "de"))) {
    sections.push({ category: key, label: key, groups: sortConsolidatedGroups(buckets.get(key)!) });
  }

  const none = buckets.get(null);
  if (none) {
    sections.push({
      category: null,
      label: UNCATEGORISED_LABEL,
      groups: sortConsolidatedGroups(none),
    });
  }

  return sections;
}
