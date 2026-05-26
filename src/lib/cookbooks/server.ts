import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { cloneRecipeImageFiles, deleteRecipeImageFiles } from "@/lib/images/upload";
import { slugify } from "@/lib/schemas/recipe";
import { type Actor, canReadCookbook, canWriteCookbook } from "@/lib/cookbooks/permissions";

type Tx = Prisma.TransactionClient;

const COOKBOOK_NAME_MAX = 80;

function ensureName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Name darf nicht leer sein");
  if (trimmed.length > COOKBOOK_NAME_MAX)
    throw new Error(`Name darf maximal ${COOKBOOK_NAME_MAX} Zeichen lang sein`);
  return trimmed;
}

export async function createCookbook(actor: Actor, name: string) {
  const cleanName = ensureName(name);
  return prisma.cookbook.create({
    data: { ownerId: actor.id, name: cleanName },
  });
}

export async function renameCookbook(actor: Actor, cookbookId: string, name: string) {
  if (!(await canWriteCookbook(actor, cookbookId))) throw new Error("Keine Berechtigung");
  return prisma.cookbook.update({
    where: { id: cookbookId },
    data: { name: ensureName(name) },
  });
}

export type CookbookBrandingInput = {
  coverImagePath?: string | null;
  accentColor?: string | null;
  inkColor?: string | null;
  paperColor?: string | null;
};

export async function updateCookbookBranding(
  actor: Actor,
  cookbookId: string,
  branding: CookbookBrandingInput,
) {
  if (!(await canWriteCookbook(actor, cookbookId))) throw new Error("Keine Berechtigung");
  return prisma.cookbook.update({
    where: { id: cookbookId },
    data: {
      coverImagePath: branding.coverImagePath ?? null,
      accentColor: branding.accentColor ?? null,
      inkColor: branding.inkColor ?? null,
      paperColor: branding.paperColor ?? null,
    },
  });
}

/**
 * Loescht ein Cookbook. Verbietet das Loeschen, wenn es das letzte eigene
 * Cookbook des Owners ist (User soll immer mindestens ein Schreibziel haben).
 * Loescht enthaltene Rezept-Bilddateien best-effort.
 */
export async function deleteCookbook(actor: Actor, cookbookId: string) {
  const cookbook = await prisma.cookbook.findUnique({
    where: { id: cookbookId },
    select: {
      ownerId: true,
      recipes: { select: { id: true, images: { select: { path: true } } } },
    },
  });
  if (!cookbook) throw new Error("Kochbuch nicht gefunden");
  if (!(await canWriteCookbook(actor, cookbookId))) throw new Error("Keine Berechtigung");

  const ownerCount = await prisma.cookbook.count({ where: { ownerId: cookbook.ownerId } });
  if (ownerCount <= 1) throw new Error("Das letzte eigene Kochbuch kann nicht geloescht werden");

  for (const recipe of cookbook.recipes) {
    for (const img of recipe.images) {
      await deleteRecipeImageFiles(img.path);
    }
  }
  return prisma.cookbook.delete({ where: { id: cookbookId } });
}

export async function shareCookbook(actor: Actor, cookbookId: string, viewerUserId: string) {
  if (!(await canWriteCookbook(actor, cookbookId))) throw new Error("Keine Berechtigung");
  const cookbook = await prisma.cookbook.findUnique({
    where: { id: cookbookId },
    select: { ownerId: true },
  });
  if (!cookbook) throw new Error("Kochbuch nicht gefunden");
  if (cookbook.ownerId === viewerUserId) throw new Error("Owner hat bereits Zugriff");
  return prisma.cookbookAccess.upsert({
    where: { cookbookId_userId: { cookbookId, userId: viewerUserId } },
    update: {},
    create: { cookbookId, userId: viewerUserId, grantedById: actor.id },
  });
}

export async function revokeCookbookShare(actor: Actor, cookbookId: string, viewerUserId: string) {
  if (!(await canWriteCookbook(actor, cookbookId))) throw new Error("Keine Berechtigung");
  await prisma.cookbookAccess
    .delete({ where: { cookbookId_userId: { cookbookId, userId: viewerUserId } } })
    .catch(() => undefined);

  // Wenn der ausgeschlossene User dieses Cookbook gerade aktiv hatte, auf
  // sein eigenes zuruecksetzen.
  const target = await prisma.user.findUnique({
    where: { id: viewerUserId },
    select: { activeCookbookId: true },
  });
  if (target?.activeCookbookId === cookbookId) {
    const own = await prisma.cookbook.findFirst({
      where: { ownerId: viewerUserId },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    await prisma.user.update({
      where: { id: viewerUserId },
      data: { activeCookbookId: own?.id ?? null },
    });
  }
}

export async function setActiveCookbook(actor: Actor, cookbookId: string) {
  if (!(await canReadCookbook(actor, cookbookId)))
    throw new Error("Kein Zugriff auf dieses Kochbuch");
  return prisma.user.update({
    where: { id: actor.id },
    data: { activeCookbookId: cookbookId },
    select: { activeCookbookId: true },
  });
}

/**
 * Listet alle Cookbooks, die der User im Switcher angeboten bekommt: eigene +
 * freigegebene (Admin sieht alle). Eigene werden zuerst sortiert.
 */
export async function listReadableCookbooks(actor: Actor) {
  const where: Prisma.CookbookWhereInput =
    actor.role === "ADMIN"
      ? {}
      : { OR: [{ ownerId: actor.id }, { accesses: { some: { userId: actor.id } } }] };
  const cookbooks = await prisma.cookbook.findMany({
    where,
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { id: true, name: true } },
    },
    orderBy: [{ ownerId: actor.id ? "asc" : "asc" }, { name: "asc" }],
  });
  return cookbooks
    .map((c) => ({ ...c, isOwn: c.ownerId === actor.id }))
    .sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      return a.name.localeCompare(b.name, "de");
    });
}

async function uniqueSlugForClone(tx: Tx, base: string): Promise<string> {
  const root = slugify(base) || "rezept";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await tx.recipe.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

/**
 * Klont ein Rezept aus einem fremden Cookbook ins angegebene Ziel-Cookbook
 * (komplette Kopie inkl. Bilder, Steps, Ingredients, Categories). Setzt
 * Quellen-Vermerk-Felder.
 */
export async function cloneRecipe(actor: Actor, sourceRecipeId: string, targetCookbookId: string) {
  if (!(await canWriteCookbook(actor, targetCookbookId)))
    throw new Error("Keine Berechtigung fuer Ziel-Kochbuch");

  const source = await prisma.recipe.findUnique({
    where: { id: sourceRecipeId },
    include: {
      ingredients: { orderBy: { order: "asc" } },
      steps: { orderBy: { position: "asc" } },
      categories: true,
      images: { orderBy: { order: "asc" } },
      cookbook: { select: { id: true, ownerId: true } },
    },
  });
  if (!source) throw new Error("Quell-Rezept nicht gefunden");
  if (source.cookbookId === targetCookbookId)
    throw new Error("Rezept ist bereits in diesem Kochbuch");
  if (!(await canReadCookbook(actor, source.cookbookId!)))
    throw new Error("Kein Zugriff auf Quell-Rezept");

  const created = await prisma.$transaction(async (tx) => {
    const newSlug = await uniqueSlugForClone(tx, source.title);
    const recipe = await tx.recipe.create({
      data: {
        title: source.title,
        slug: newSlug,
        description: source.description,
        servings: source.servings,
        prepMinutes: source.prepMinutes,
        cookMinutes: source.cookMinutes,
        difficulty: source.difficulty,
        instructions: source.instructions,
        notes: source.notes,
        sourceUrl: source.sourceUrl,
        sourceType: source.sourceType,
        tags: source.tags,
        nutritionKcal: source.nutritionKcal,
        nutritionProteinG: source.nutritionProteinG,
        nutritionCarbsG: source.nutritionCarbsG,
        nutritionFatG: source.nutritionFatG,
        cookbookId: targetCookbookId,
        createdById: actor.id,
        importedFromRecipeId: source.id,
        importedFromCookbookId: source.cookbookId,
        importedFromUserId: source.createdById,
        ingredients: {
          create: source.ingredients.map((ing) => ({
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unit: ing.unit,
            note: ing.note,
            group: ing.group,
            order: ing.order,
          })),
        },
        steps: {
          create: source.steps.map((s) => ({
            position: s.position,
            text: s.text,
            durationSeconds: s.durationSeconds,
          })),
        },
        categories: {
          create: source.categories.map((c) => ({ categoryId: c.categoryId })),
        },
      },
    });
    return recipe;
  });

  // Bilder ausserhalb der Transaktion kopieren (Dateisystem-IO).
  for (const [index, img] of source.images.entries()) {
    const copied = await cloneRecipeImageFiles(img.path, created.id);
    if (!copied) continue;
    await prisma.recipeImage.create({
      data: {
        recipeId: created.id,
        path: copied.path,
        order: index,
        caption: img.caption,
      },
    });
  }
  return created;
}
