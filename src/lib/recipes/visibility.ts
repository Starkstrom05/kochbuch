import type { Prisma } from "@prisma/client";

/**
 * Kategorien sind global (cookbookId = null, in jedem Cookbook sichtbar) oder an
 * ein Cookbook gebunden. Ein aktives Cookbook sieht globale + die eigenen.
 * Recipe-Visibility lebt in `@/lib/cookbooks/visibility.ts`.
 */
export function categoryVisibleToCookbook(
  cookbookId: string | null | undefined,
): Prisma.CategoryWhereInput {
  return cookbookId ? { OR: [{ cookbookId: null }, { cookbookId }] } : { cookbookId: null };
}
