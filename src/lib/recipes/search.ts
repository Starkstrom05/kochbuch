import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type RecipeSearch = {
  q?: string;
  categoryId?: string;
  /** Minimaler Durchschnitt der Sternebewertung (1-5). 0 oder undefined = kein Filter. */
  minStars?: number;
  take?: number;
};

export async function searchRecipes({
  q,
  categoryId,
  minStars,
  take = 200,
}: RecipeSearch) {
  const where: Prisma.RecipeWhereInput = { isActive: true };

  if (q && q.trim()) {
    const term = q.trim();
    where.OR = [
      { title: { contains: term } },
      { description: { contains: term } },
      { instructions: { contains: term } },
      { tags: { contains: term } },
      { ingredients: { some: { ingredient: { name: { contains: term } } } } },
    ];
  }

  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  // Stern-Filter über GROUP BY + HAVING auf der Rating-Tabelle: liefert
  // recipeId für alle Rezepte mit AVG(stars) >= minStars. Ohne Treffer →
  // leere Liste, sonst per id-IN-Filter in die Hauptquery einschneiden.
  if (minStars && minStars > 0) {
    const rated = await prisma.$queryRaw<{ recipeId: string }[]>(Prisma.sql`
      SELECT "recipeId" FROM "Rating"
      GROUP BY "recipeId"
      HAVING AVG(CAST("stars" AS REAL)) >= ${minStars}
    `);
    if (rated.length === 0) return [];
    where.id = { in: rated.map((r) => r.recipeId) };
  }

  const recipes = await prisma.recipe.findMany({
    where,
    take,
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      ratings: { select: { stars: true } },
      images: {
        orderBy: { order: "asc" },
        take: 1,
        select: { path: true },
      },
    },
  });

  return recipes;
}
