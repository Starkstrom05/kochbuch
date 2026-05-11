import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export type RecipeSearch = {
  q?: string;
  categoryId?: string;
  take?: number;
};

export async function searchRecipes({ q, categoryId, take = 60 }: RecipeSearch) {
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

  return prisma.recipe.findMany({
    where,
    take,
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      ratings: { select: { stars: true } },
    },
  });
}
