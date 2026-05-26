import { prisma } from "@/lib/db/prisma";
import { consolidateList, type RawItem } from "@/lib/shopping/consolidate";
import { buildOurGroceriesItems, type ItemSource } from "./export";
import type { OurGroceriesItem } from "./client";

/**
 * Laedt die Items einer ShoppingList aus der DB und reichert sie mit der
 * `Ingredient.category` an (Lookup case-insensitive ueber den Namen). Liefert
 * die fuer den OurGroceries-Export bereiten Items zurueck.
 *
 * Wirft NICHT, wenn die Liste leer ist — gibt dann ein leeres Array.
 */
export async function loadExportItemsForList(listId: string): Promise<OurGroceriesItem[]> {
  const items = await prisma.shoppingItem.findMany({
    where: { listId },
    orderBy: { id: "asc" },
  });
  if (items.length === 0) return [];

  const rawItems: RawItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    amount: i.amount,
    unit: i.unit,
    recipeRef: i.recipeRef,
    checked: i.checked,
  }));

  const groups = consolidateList(rawItems);

  const ingredients = await prisma.ingredient.findMany({
    select: { name: true, category: true },
  });
  const categoryByName = new Map<string, string | null>();
  for (const ing of ingredients) {
    categoryByName.set(ing.name.toLowerCase(), ing.category);
  }

  const sources: ItemSource[] = groups.map((group) => ({
    group,
    ingredientCategory: categoryByName.get(group.name.toLowerCase()) ?? null,
  }));

  return buildOurGroceriesItems(sources);
}
