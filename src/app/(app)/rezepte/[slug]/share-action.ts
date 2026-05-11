"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";

export async function toggleShareAction(recipeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  if (recipe.createdById !== session.user.id) throw new Error("Keine Berechtigung");

  if (recipe.isPublic && recipe.shareToken) {
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { isPublic: false, shareToken: null },
    });
  } else {
    const token = randomBytes(18).toString("base64url");
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { isPublic: true, shareToken: token },
    });
  }

  revalidatePath(`/rezepte/${recipe.slug}`);
}
