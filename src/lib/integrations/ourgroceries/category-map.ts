/**
 * Mapping deutsche Ingredient.category → OurGroceries-Aisle-Anzeigename.
 *
 * OurGroceries kennt keine fest verdrahteten Aisles — der Name ist freier
 * Text. Wir senden englische Standardnamen, weil das Auto-Match besser greift
 * und sich gut mit englischen Standardlisten mischt. Unbekannte Kategorien
 * werden 1:1 als Custom-Aisle an OurGroceries durchgereicht.
 */
const MAP: Record<string, string> = {
  Gemuese: "Produce",
  Gemüse: "Produce",
  Obst: "Produce",
  Kuehlregal: "Dairy",
  Kühlregal: "Dairy",
  Milch: "Dairy",
  Trockenwaren: "Dry Goods",
  Vorrat: "Pantry",
  Gewuerze: "Spices",
  Gewürze: "Spices",
  Fisch: "Seafood",
  Fleisch: "Meat",
  Wurst: "Meat",
  Backen: "Baking",
  Tiefkuehl: "Frozen",
  Tiefkühl: "Frozen",
  Getraenke: "Beverages",
  Getränke: "Beverages",
  Sonstiges: "Other",
};

export function mapCategoryToAisle(category: string | null | undefined): string | null {
  if (!category) return null;
  const trimmed = category.trim();
  if (!trimmed) return null;
  return MAP[trimmed] ?? trimmed;
}
