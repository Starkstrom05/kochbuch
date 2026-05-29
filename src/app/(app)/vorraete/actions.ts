"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { canReadRecipe } from "@/lib/cookbooks/permissions";
import { requireUser } from "@/lib/auth/helpers";
import {
  addPantryItem,
  buildMatcher,
  clearPantry,
  matchesPantry,
  removePantryItem,
} from "@/lib/pantry/server";
import { resolveWriteTargetList, touchList } from "@/lib/shopping/server";

const pantryItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().finite().min(0).max(99999).nullable(),
  unit: z.string().trim().max(30).nullable(),
});

export async function addPantryItemAction(formData: FormData) {
  const user = await requireUser();
  const nameRaw = String(formData.get("name") ?? "").trim();
  if (!nameRaw) return;
  const amountRaw = String(formData.get("amount") ?? "");
  const amountParsed = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
  const unitRaw = String(formData.get("unit") ?? "").trim() || null;

  const parsed = pantryItemSchema.parse({
    name: nameRaw,
    amount: Number.isFinite(amountParsed as number) ? amountParsed : null,
    unit: unitRaw,
  });

  await addPantryItem(user.id, parsed.name, parsed.amount, parsed.unit);
  revalidatePath("/vorraete");
}

export async function removePantryItemAction(itemId: string) {
  const user = await requireUser();
  await removePantryItem(user.id, itemId);
  revalidatePath("/vorraete");
}

export async function clearPantryAction() {
  const user = await requireUser();
  await clearPantry(user.id);
  revalidatePath("/vorraete");
}

/**
 * Übernimmt die fehlenden Zutaten eines Rezepts (also alles, was nicht im
 * Vorrat ist) in die aktive Einkaufsliste — und leitet auf die Liste um.
 */
export async function addMissingToListAction(recipeId: string, listId?: string) {
  const user = await requireUser();

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
    },
  });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  const allowed = await canReadRecipe({ id: user.id, role: user.role }, recipe);
  if (!allowed) throw new Error("Keine Berechtigung");

  const pantry = await prisma.pantryItem.findMany({
    where: { ownerId: user.id },
    select: { ingredientId: true, ingredient: { select: { name: true } } },
  });
  const matcher = buildMatcher(pantry);
  const missing = recipe.ingredients.filter((ri) => !matchesPantry(matcher, ri));
  if (missing.length === 0) {
    revalidatePath("/vorraete");
    redirect(listId ? `/einkaufsliste/${listId}` : "/einkaufsliste");
  }

  const list = await resolveWriteTargetList({ id: user.id, role: user.role }, listId);
  await prisma.shoppingItem.createMany({
    data: missing.map((ri) => ({
      listId: list.id,
      name: ri.ingredient.name,
      amount: ri.amount,
      unit: ri.unit,
      recipeRef: recipe.title,
    })),
  });
  await touchList(list.id);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${list.id}`);
  redirect(listId ? `/einkaufsliste/${list.id}` : "/einkaufsliste");
}
