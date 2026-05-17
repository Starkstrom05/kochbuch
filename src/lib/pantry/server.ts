import { prisma } from "@/lib/db/prisma";
import type { Ingredient, PantryItem } from "@prisma/client";

// ── Pantry-CRUD ──────────────────────────────────────────────────────────────

export async function getPantryForUser(userId: string): Promise<
  (PantryItem & { ingredient: Ingredient })[]
> {
  return prisma.pantryItem.findMany({
    where: { ownerId: userId },
    include: { ingredient: true },
    orderBy: { ingredient: { name: "asc" } },
  });
}

/**
 * Idempotent: legt einen Pantry-Eintrag an, oder ersetzt Menge/Einheit, wenn
 * für (owner, ingredient) schon ein Eintrag existiert. Zutat wird per
 * findOrCreate aus dem normalisierten Ingredient-Bestand gezogen — gleicher
 * Name (case-insensitive, getrimmt) trifft denselben Eintrag.
 */
export async function addPantryItem(
  userId: string,
  rawName: string,
  amount: number | null,
  unit: string | null,
): Promise<PantryItem & { ingredient: Ingredient }> {
  const name = rawName.trim();
  if (!name) throw new Error("Zutatenname fehlt");

  // Ingredient.name ist @unique aber case-sensitive — wir normalisieren auf
  // den ersten Eintrag, der case-insensitive matched, oder legen einen mit
  // dem original-cased Namen an.
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: name } },
  });
  const ingredient =
    existing ??
    (await prisma.ingredient.create({
      data: { name },
    }));

  return prisma.pantryItem.upsert({
    where: { ownerId_ingredientId: { ownerId: userId, ingredientId: ingredient.id } },
    create: { ownerId: userId, ingredientId: ingredient.id, amount, unit },
    update: { amount, unit },
    include: { ingredient: true },
  });
}

export async function removePantryItem(userId: string, itemId: string): Promise<void> {
  await prisma.pantryItem.deleteMany({ where: { id: itemId, ownerId: userId } });
}

export async function clearPantry(userId: string): Promise<void> {
  await prisma.pantryItem.deleteMany({ where: { ownerId: userId } });
}

// ── Match ────────────────────────────────────────────────────────────────────

export type RecipeMatch = {
  recipeId: string;
  slug: string;
  title: string;
  servings: number;
  coverPath: string | null;
  matched: { id: string; name: string }[];
  missing: { id: string; name: string; amount: number | null; unit: string | null }[];
  total: number;
  /** matched / total — anteilige Abdeckung des Rezepts durch den Vorrat. */
  ratio: number;
};

/**
 * Match aller aktiven Rezepte gegen die Pantry des Nutzers. Sortiert
 * primär nach absolutem Treffer (matched DESC), sekundär nach Lücke
 * (missing ASC). Liefert nur Rezepte mit mindestens einem Treffer.
 */
export async function matchRecipesForUser(
  userId: string,
  limit = 20,
): Promise<RecipeMatch[]> {
  const pantry = await getPantryForUser(userId);
  if (pantry.length === 0) return [];
  const pantryIds = new Set(pantry.map((p) => p.ingredientId));

  const recipes = await prisma.recipe.findMany({
    where: { isActive: true },
    include: {
      ingredients: { include: { ingredient: true } },
      images: { orderBy: { order: "asc" }, take: 1, select: { path: true } },
    },
  });

  return rankMatches(pantryIds, recipes).slice(0, limit);
}

type RawRecipe = {
  id: string;
  slug: string;
  title: string;
  servings: number;
  images: { path: string }[];
  ingredients: {
    ingredientId: string;
    amount: number | null;
    unit: string | null;
    ingredient: { name: string };
  }[];
};

export function rankMatches(
  pantryIds: Set<string>,
  recipes: RawRecipe[],
): RecipeMatch[] {
  const out: RecipeMatch[] = [];
  for (const r of recipes) {
    if (r.ingredients.length === 0) continue;
    const matched: RecipeMatch["matched"] = [];
    const missing: RecipeMatch["missing"] = [];
    for (const ri of r.ingredients) {
      if (pantryIds.has(ri.ingredientId)) {
        matched.push({ id: ri.ingredientId, name: ri.ingredient.name });
      } else {
        missing.push({
          id: ri.ingredientId,
          name: ri.ingredient.name,
          amount: ri.amount,
          unit: ri.unit,
        });
      }
    }
    if (matched.length === 0) continue;
    out.push({
      recipeId: r.id,
      slug: r.slug,
      title: r.title,
      servings: r.servings,
      coverPath: r.images[0]?.path ?? null,
      matched,
      missing,
      total: r.ingredients.length,
      ratio: matched.length / r.ingredients.length,
    });
  }
  out.sort((a, b) => {
    if (b.matched.length !== a.matched.length) {
      return b.matched.length - a.matched.length;
    }
    return a.missing.length - b.missing.length;
  });
  return out;
}
