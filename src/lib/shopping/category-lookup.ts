import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { RawItem } from "./consolidate";

/**
 * Reichert Einkaufslisten-Items mit ihrer Gang-Kategorie an, indem der
 * (case-insensitive) Item-Name exakt gegen Ingredient.name gematcht wird.
 * Rezept-Items tragen ohnehin den Ingredient-Namen; manuelle Items treffen
 * dank Auto-Complete meist denselben Stammdaten-Eintrag. Kein Treffer →
 * category bleibt null ("Sonstiges").
 */
export async function attachCategories<T extends Omit<RawItem, "category">>(
  items: T[],
): Promise<(T & { category: string | null })[]> {
  const names = [...new Set(items.map((i) => i.name.toLowerCase().trim()).filter(Boolean))];
  if (names.length === 0) return items.map((i) => ({ ...i, category: null }));

  const rows = await prisma.$queryRaw<{ name: string; category: string | null }[]>(
    Prisma.sql`SELECT name, category FROM "Ingredient"
               WHERE category IS NOT NULL AND LOWER(name) IN (${Prisma.join(names)})`,
  );
  const byName = new Map<string, string>();
  for (const r of rows) {
    if (r.category) byName.set(r.name.toLowerCase().trim(), r.category);
  }

  return items.map((i) => ({ ...i, category: byName.get(i.name.toLowerCase().trim()) ?? null }));
}
