import type { Prisma } from "@prisma/client";

/**
 * Kategorien sind nicht an Cookbooks gebunden, sondern bleiben familienweit
 * sichtbar (global oder pro Family). Recipe-Visibility lebt jetzt in
 * `@/lib/cookbooks/visibility.ts` und nutzt cookbookId.
 */
export function categoryVisibleToFamily(
  familyId: string | null | undefined,
): Prisma.CategoryWhereInput {
  return familyId ? { OR: [{ familyId: null }, { familyId }] } : { familyId: null };
}
