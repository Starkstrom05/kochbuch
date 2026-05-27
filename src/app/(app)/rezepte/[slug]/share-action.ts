"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canWriteRecipe } from "@/lib/cookbooks/permissions";

export async function toggleShareAction(
  recipeId: string,
): Promise<{ isPublic: boolean; token: string | null }> {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  const allowed = await canWriteRecipe({ id: session.user.id, role: session.user.role }, recipe);
  if (!allowed) throw new Error("Keine Berechtigung");

  let newState: { isPublic: boolean; token: string | null };
  if (recipe.isPublic && recipe.shareToken) {
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { isPublic: false, shareToken: null },
    });
    newState = { isPublic: false, token: null };
  } else {
    const token = randomBytes(18).toString("base64url");
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { isPublic: true, shareToken: token },
    });
    newState = { isPublic: true, token };
  }

  revalidatePath(`/rezepte/${recipe.slug}`);
  return newState;
}
