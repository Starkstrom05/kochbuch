import type { Prisma } from "@prisma/client";

/**
 * Where-Fragment: Rezept ist sichtbar, wenn es zum gegebenen Cookbook gehoert.
 * Die Read-Berechtigung (Owner/Viewer/Admin) wird separat ueber
 * `canReadCookbook` geprueft.
 */
export function visibleInCookbook(cookbookId: string): Prisma.RecipeWhereInput {
  return { cookbookId };
}
