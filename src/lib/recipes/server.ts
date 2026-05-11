import { prisma } from "@/lib/db/prisma";
import { type RecipeInput, slugify } from "@/lib/schemas/recipe";

async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "rezept";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await prisma.recipe.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

async function upsertIngredients(names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    if (map.has(name.toLowerCase())) continue;
    const ing = await prisma.ingredient.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    map.set(name.toLowerCase(), ing.id);
  }
  return map;
}

export async function createRecipe(input: RecipeInput, userId: string) {
  const slug = await uniqueSlug(slugify(input.title));
  const ingredientMap = await upsertIngredients(input.ingredients.map((i) => i.name));

  return prisma.recipe.create({
    data: {
      title: input.title,
      slug,
      description: input.description ?? null,
      servings: input.servings,
      prepMinutes: input.prepMinutes ?? null,
      cookMinutes: input.cookMinutes ?? null,
      difficulty: input.difficulty ?? null,
      instructions: input.instructions,
      notes: input.notes ?? null,
      sourceUrl: input.sourceUrl || null,
      sourceType: input.sourceType,
      tags: input.tags ?? null,
      createdById: userId,
      categories: {
        create: input.categoryIds.map((categoryId) => ({ categoryId })),
      },
      ingredients: {
        create: input.ingredients.map((ing, order) => ({
          ingredientId: ingredientMap.get(ing.name.trim().toLowerCase())!,
          amount: ing.amount ?? null,
          unit: ing.unit ?? null,
          note: ing.note ?? null,
          group: ing.group ?? null,
          order,
        })),
      },
    },
  });
}

export async function updateRecipe(id: string, input: RecipeInput, userId: string) {
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) throw new Error("Rezept nicht gefunden");
  if (existing.createdById !== userId) throw new Error("Keine Berechtigung");

  const newSlug =
    existing.title === input.title
      ? existing.slug
      : await uniqueSlug(slugify(input.title), id);

  const ingredientMap = await upsertIngredients(input.ingredients.map((i) => i.name));

  return prisma.$transaction(async (tx) => {
    await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await tx.categoryOnRecipe.deleteMany({ where: { recipeId: id } });
    return tx.recipe.update({
      where: { id },
      data: {
        title: input.title,
        slug: newSlug,
        description: input.description ?? null,
        servings: input.servings,
        prepMinutes: input.prepMinutes ?? null,
        cookMinutes: input.cookMinutes ?? null,
        difficulty: input.difficulty ?? null,
        instructions: input.instructions,
        notes: input.notes ?? null,
        sourceUrl: input.sourceUrl || null,
        sourceType: input.sourceType,
        tags: input.tags ?? null,
        categories: {
          create: input.categoryIds.map((categoryId) => ({ categoryId })),
        },
        ingredients: {
          create: input.ingredients.map((ing, order) => ({
            ingredientId: ingredientMap.get(ing.name.trim().toLowerCase())!,
            amount: ing.amount ?? null,
            unit: ing.unit ?? null,
            note: ing.note ?? null,
            group: ing.group ?? null,
            order,
          })),
        },
      },
    });
  });
}

export async function deleteRecipe(id: string, userId: string) {
  const existing = await prisma.recipe.findUnique({ where: { id } });
  if (!existing) throw new Error("Rezept nicht gefunden");
  if (existing.createdById !== userId) throw new Error("Keine Berechtigung");
  return prisma.recipe.delete({ where: { id } });
}

export async function getRecipeBySlug(slug: string) {
  return prisma.recipe.findUnique({
    where: { slug },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      categories: { include: { category: true } },
      ratings: { include: { user: { select: { id: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
    },
  });
}

export async function getRecipeByShareToken(token: string) {
  return prisma.recipe.findFirst({
    where: { shareToken: token, isPublic: true },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      categories: { include: { category: true } },
    },
  });
}
