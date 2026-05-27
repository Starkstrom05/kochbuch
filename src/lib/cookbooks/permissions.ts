import { prisma } from "@/lib/db/prisma";
import type { Role } from "@/lib/db/enums";

export type Actor = {
  id: string;
  role: Role;
};

type RecipeForPermission = {
  cookbook?: { ownerId: string } | null;
  cookbookId?: string | null;
};

type CookbookForDecision = {
  ownerId: string;
  viewerIds: string[];
};

/**
 * Pure Permission-Entscheidung ohne DB. Owner oder ADMIN duerfen schreiben.
 */
export function decideWriteCookbook(actor: Actor, cookbook: { ownerId: string }): boolean {
  if (actor.role === "ADMIN") return true;
  return cookbook.ownerId === actor.id;
}

/**
 * Pure Schreib-Entscheidung fuer ein bereits geladenes Rezept. Erspart einen
 * weiteren Cookbook-Lookup, wenn das Rezept schon mit `cookbook: { ownerId }`
 * im Include kommt — sonst lieber `canWriteRecipe` benutzen.
 */
export function decideWriteRecipe(
  actor: Actor,
  recipe: { cookbook?: { ownerId: string } | null },
): boolean {
  if (actor.role === "ADMIN") return true;
  if (!recipe.cookbook) return false;
  return recipe.cookbook.ownerId === actor.id;
}

/**
 * Pure Permission-Entscheidung ohne DB. Owner, eingetragener Viewer oder
 * ADMIN duerfen lesen.
 */
export function decideReadCookbook(actor: Actor, cookbook: CookbookForDecision): boolean {
  if (actor.role === "ADMIN") return true;
  if (cookbook.ownerId === actor.id) return true;
  return cookbook.viewerIds.includes(actor.id);
}

/**
 * Owner oder ADMIN duerfen in ein Cookbook schreiben (Settings, Branding,
 * Freigaben, Rezepte anlegen/aendern/loeschen).
 */
export async function canWriteCookbook(actor: Actor, cookbookId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  const cookbook = await prisma.cookbook.findUnique({
    where: { id: cookbookId },
    select: { ownerId: true },
  });
  return cookbook ? decideWriteCookbook(actor, cookbook) : false;
}

/**
 * Owner, eingetragener Viewer oder ADMIN duerfen lesen.
 */
export async function canReadCookbook(actor: Actor, cookbookId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  const cookbook = await prisma.cookbook.findUnique({
    where: { id: cookbookId },
    select: {
      ownerId: true,
      accesses: { where: { userId: actor.id }, select: { userId: true } },
    },
  });
  if (!cookbook) return false;
  return decideReadCookbook(actor, {
    ownerId: cookbook.ownerId,
    viewerIds: cookbook.accesses.map((a) => a.userId),
  });
}

/**
 * Schreibrecht auf ein Rezept: Owner des zugehoerigen Cookbooks oder ADMIN.
 * Erwartet ein Rezept mit geladenem `cookbook.ownerId` ODER `cookbookId`
 * (in dem Fall wird der Cookbook nachgeladen).
 */
export async function canWriteRecipe(actor: Actor, recipe: RecipeForPermission): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  if (recipe.cookbook) return recipe.cookbook.ownerId === actor.id;
  if (!recipe.cookbookId) return false;
  return canWriteCookbook(actor, recipe.cookbookId);
}

/**
 * Leserecht auf ein Rezept: Read-Berechtigung auf dessen Cookbook ODER
 * oeffentliches Rezept (Share-Token-Logik laeuft anderswo).
 */
export async function canReadRecipe(actor: Actor, recipe: RecipeForPermission): Promise<boolean> {
  if (!recipe.cookbookId) return false;
  return canReadCookbook(actor, recipe.cookbookId);
}

/**
 * Liefert alle Cookbook-IDs, die der User lesen darf (eigene + freigegebene).
 * Admin sieht alle Cookbooks.
 */
export async function readableCookbookIds(actor: Actor): Promise<string[]> {
  if (actor.role === "ADMIN") {
    const all = await prisma.cookbook.findMany({ select: { id: true } });
    return all.map((c) => c.id);
  }
  const cookbooks = await prisma.cookbook.findMany({
    where: {
      OR: [{ ownerId: actor.id }, { accesses: { some: { userId: actor.id } } }],
    },
    select: { id: true },
  });
  return cookbooks.map((c) => c.id);
}
