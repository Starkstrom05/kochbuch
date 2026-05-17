"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  addPantryItem,
  buildMatcher,
  clearPantry,
  matchesPantry,
  removePantryItem,
} from "@/lib/pantry/server";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  return session.user;
}

async function getOrCreateList(userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.shoppingList.create({
    data: { name: "Einkaufsliste", ownerId: userId },
  });
}

export async function addPantryItemAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const amountRaw = String(formData.get("amount") ?? "");
  const amount = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
  const unit = String(formData.get("unit") ?? "").trim() || null;

  await addPantryItem(
    user.id,
    name,
    Number.isFinite(amount as number) ? amount : null,
    unit,
  );
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
export async function addMissingToListAction(recipeId: string) {
  const user = await requireUser();

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
    },
  });
  if (!recipe) throw new Error("Rezept nicht gefunden");

  const pantry = await prisma.pantryItem.findMany({
    where: { ownerId: user.id },
    select: { ingredientId: true, ingredient: { select: { name: true } } },
  });
  const matcher = buildMatcher(pantry);
  const missing = recipe.ingredients.filter((ri) => !matchesPantry(matcher, ri));
  if (missing.length === 0) {
    revalidatePath("/vorraete");
    redirect("/einkaufsliste");
  }

  const list = await getOrCreateList(user.id);
  await prisma.shoppingItem.createMany({
    data: missing.map((ri) => ({
      listId: list.id,
      name: ri.ingredient.name,
      amount: ri.amount,
      unit: ri.unit,
      recipeRef: recipe.title,
    })),
  });
  revalidatePath("/einkaufsliste");
  redirect("/einkaufsliste");
}
