"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canReadRecipe } from "@/lib/cookbooks/permissions";

const rateSchema = z.object({
  recipeId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(2000).nullable().optional(),
});

export async function rateRecipeAction(input: z.infer<typeof rateSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");

  const parsed = rateSchema.parse(input);
  const recipe = await prisma.recipe.findUnique({ where: { id: parsed.recipeId } });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  const allowed = await canReadRecipe({ id: session.user.id, role: session.user.role }, recipe);
  if (!allowed) throw new Error("Keine Berechtigung");

  await prisma.rating.upsert({
    where: {
      recipeId_userId: { recipeId: parsed.recipeId, userId: session.user.id },
    },
    update: { stars: parsed.stars, comment: parsed.comment ?? null },
    create: {
      recipeId: parsed.recipeId,
      userId: session.user.id,
      stars: parsed.stars,
      comment: parsed.comment ?? null,
    },
  });

  revalidatePath(`/rezepte/${recipe.slug}`);
  revalidatePath("/rezepte");
}
