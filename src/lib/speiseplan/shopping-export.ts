import { prisma } from "@/lib/db/prisma";
import { scaleAmount } from "@/lib/units/fraction";

export async function buildShoppingItemsForEntries(entryIds: string[]) {
  if (entryIds.length === 0) return [];

  const entries = await prisma.mealPlanEntry.findMany({
    where: { id: { in: entryIds } },
    include: {
      recipe: {
        include: {
          ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  return entries.flatMap((entry) =>
    entry.recipe.ingredients.map((ri) => ({
      name: ri.ingredient.name,
      amount:
        ri.amount != null
          ? Math.round((scaleAmount(ri.amount, entry.recipe.servings, entry.servings) ?? ri.amount) * 100) / 100
          : null,
      unit: ri.unit ?? null,
      recipeRef: entry.recipe.title,
    })),
  );
}
