import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { type RecipeInput, slugify } from "@/lib/schemas/recipe";
import { splitInstructionsToSteps, stepsToInstructions } from "@/lib/recipes/steps";
import {
  type Actor,
  canReadRecipe,
  canWriteCookbook,
  canWriteRecipe,
} from "@/lib/cookbooks/permissions";

/**
 * Resolve structured steps + the synced `instructions` text from the input.
 * Editor sends structured `steps`; importers (Web/OCR) only send free-text
 * `instructions` — in that case derive steps by splitting. `instructions` stays
 * the canonical text for detail page, book mode, PDF and search.
 */
function resolveSteps(input: RecipeInput): {
  steps: { position: number; text: string; durationSeconds: number | null }[];
  instructions: string;
} {
  const source = input.steps?.length
    ? input.steps.map((s) => ({ text: s.text, durationSeconds: s.durationSeconds ?? null }))
    : splitInstructionsToSteps(input.instructions);
  const instructions = input.steps?.length ? stepsToInstructions(input.steps) : input.instructions;
  return {
    steps: source.map((s, position) => ({
      position,
      text: s.text,
      durationSeconds: s.durationSeconds,
    })),
    instructions,
  };
}

type Tx = Prisma.TransactionClient;

async function uniqueSlug(tx: Tx, base: string, excludeId?: string): Promise<string> {
  const root = base || "rezept";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await tx.recipe.findUnique({ where: { slug: candidate } });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

async function upsertIngredients(tx: Tx, names: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    if (map.has(name.toLowerCase())) continue;
    const ing = await tx.ingredient.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    map.set(name.toLowerCase(), ing.id);
  }
  return map;
}

function friendlyP2002(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error("Ein Rezept mit diesem Titel existiert bereits");
  }
  throw err;
}

export async function createRecipe(input: RecipeInput, actor: Actor, cookbookId: string) {
  if (!(await canWriteCookbook(actor, cookbookId)))
    throw new Error("Keine Berechtigung fuer dieses Kochbuch");
  try {
    return await prisma.$transaction(async (tx) => {
      const slug = await uniqueSlug(tx, slugify(input.title));
      const ingredientMap = await upsertIngredients(
        tx,
        input.ingredients.map((i) => i.name),
      );
      const { steps, instructions } = resolveSteps(input);

      return tx.recipe.create({
        data: {
          title: input.title,
          slug,
          description: input.description ?? null,
          servings: input.servings,
          prepMinutes: input.prepMinutes ?? null,
          cookMinutes: input.cookMinutes ?? null,
          difficulty: input.difficulty ?? null,
          instructions,
          notes: input.notes ?? null,
          sourceUrl: input.sourceUrl || null,
          sourceType: input.sourceType,
          tags: input.tags ?? null,
          nutritionKcal: input.nutritionKcal ?? null,
          nutritionProteinG: input.nutritionProteinG ?? null,
          nutritionCarbsG: input.nutritionCarbsG ?? null,
          nutritionFatG: input.nutritionFatG ?? null,
          cookbookId,
          createdById: actor.id,
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
          steps: { create: steps },
        },
      });
    });
  } catch (err) {
    friendlyP2002(err);
  }
}

export async function updateRecipe(id: string, input: RecipeInput, actor: Actor) {
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.recipe.findUnique({
        where: { id },
        include: { cookbook: { select: { ownerId: true } } },
      });
      if (!existing) throw new Error("Rezept nicht gefunden");
      if (!(await canWriteRecipe(actor, existing))) throw new Error("Keine Berechtigung");

      const newSlug =
        existing.title === input.title
          ? existing.slug
          : await uniqueSlug(tx, slugify(input.title), id);

      const ingredientMap = await upsertIngredients(
        tx,
        input.ingredients.map((i) => i.name),
      );
      const { steps, instructions } = resolveSteps(input);

      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await tx.categoryOnRecipe.deleteMany({ where: { recipeId: id } });
      await tx.recipeStep.deleteMany({ where: { recipeId: id } });
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
          instructions,
          notes: input.notes ?? null,
          sourceUrl: input.sourceUrl || null,
          sourceType: input.sourceType,
          tags: input.tags ?? null,
          nutritionKcal: input.nutritionKcal ?? null,
          nutritionProteinG: input.nutritionProteinG ?? null,
          nutritionCarbsG: input.nutritionCarbsG ?? null,
          nutritionFatG: input.nutritionFatG ?? null,
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
          steps: { create: steps },
        },
      });
    });
  } catch (err) {
    friendlyP2002(err);
  }
}

export async function deactivateRecipe(id: string, actor: Actor) {
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { cookbook: { select: { ownerId: true } } },
  });
  if (!existing) throw new Error("Rezept nicht gefunden");
  if (!(await canWriteRecipe(actor, existing))) throw new Error("Keine Berechtigung");
  return prisma.recipe.update({ where: { id }, data: { isActive: false } });
}

export async function restoreRecipe(id: string, actor: Actor) {
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { cookbook: { select: { ownerId: true } } },
  });
  if (!existing) throw new Error("Rezept nicht gefunden");
  if (!(await canWriteRecipe(actor, existing))) throw new Error("Keine Berechtigung");
  return prisma.recipe.update({ where: { id }, data: { isActive: true } });
}

export async function permanentlyDeleteRecipe(id: string, actor: Actor) {
  const existing = await prisma.recipe.findUnique({
    where: { id },
    include: { cookbook: { select: { ownerId: true } } },
  });
  if (!existing) throw new Error("Rezept nicht gefunden");
  if (!(await canWriteRecipe(actor, existing))) throw new Error("Keine Berechtigung");
  if (existing.isActive) throw new Error("Rezept muss zuerst deaktiviert werden");
  return prisma.recipe.delete({ where: { id } });
}

/**
 * Archiv eines Cookbooks. Admin sieht alle inaktiven Rezepte; normaler User
 * sieht nur seine eigenen inaktiven Rezepte im aktiven Cookbook.
 */
export async function getArchivedRecipes(actor: Actor, cookbookId: string) {
  const where: Prisma.RecipeWhereInput = { isActive: false, cookbookId };
  if (actor.role !== "ADMIN") where.createdById = actor.id;
  return prisma.recipe.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      images: { orderBy: { order: "asc" }, take: 1, select: { path: true } },
    },
  });
}

/**
 * Laedt ein Rezept und prueft, ob der Viewer es lesen darf. `viewer` darf null
 * sein (oeffentlicher Zugriff via Share-Token laeuft ueber
 * getRecipeByShareToken, nicht hier).
 */
export async function getRecipeBySlug(slug: string, viewer: Actor | null) {
  const recipe = await prisma.recipe.findFirst({
    where: { slug, isActive: true },
    include: {
      ingredients: {
        include: { ingredient: { include: { nutrition: true } } },
        orderBy: { order: "asc" },
      },
      categories: { include: { category: true } },
      ratings: { include: { user: { select: { id: true, name: true } } } },
      createdBy: { select: { id: true, name: true } },
      images: { orderBy: { order: "asc" } },
      steps: { orderBy: { position: "asc" } },
      cookbook: { select: { id: true, name: true, ownerId: true } },
      importedFromRecipe: { select: { id: true, slug: true, title: true, cookbookId: true } },
    },
  });
  if (!recipe) return null;
  if (!viewer) return null;
  const allowed = await canReadRecipe(viewer, recipe);
  if (!allowed) return null;
  return recipe;
}

export async function getRecipeByShareToken(token: string) {
  return prisma.recipe.findFirst({
    where: { shareToken: token, isPublic: true },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      categories: { include: { category: true } },
      images: { orderBy: { order: "asc" } },
    },
  });
}
