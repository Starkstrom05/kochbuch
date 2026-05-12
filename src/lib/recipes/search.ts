import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

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
  const where: Prisma.RecipeWhereInput = {};

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

  // Stern-Filter wird im Code angewendet: SQLite hat keinen einfachen Weg,
  // im WHERE über AVG einer Relation zu filtern.
  if (minStars && minStars > 0) {
    return recipes.filter((r) => {
      if (r.ratings.length === 0) return false;
      const avg =
        r.ratings.reduce((s, x) => s + x.stars, 0) / r.ratings.length;
      return avg >= minStars;
    });
  }
  return recipes;
}
