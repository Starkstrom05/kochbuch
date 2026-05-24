import type { Prisma } from "@prisma/client";

/**
 * Where-Fragment: Rezept ist sichtbar, wenn es SHARED ist (gemeinsamer Pool)
 * oder zur eigenen Familie gehört. Ohne familyId nur SHARED.
 */
export function visibleToFamily(
  familyId: string | null | undefined,
): Prisma.RecipeWhereInput {
  return familyId
    ? { OR: [{ visibility: "SHARED" }, { familyId }] }
    : { visibility: "SHARED" };
}
