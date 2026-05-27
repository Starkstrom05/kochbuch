"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canReadRecipe } from "@/lib/cookbooks/permissions";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Actions ───────────────────────────────────────────────────────────────────

export async function addRecipeToListAction(recipeId: string, targetServings?: number) {
  const user = await requireUser();

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } } },
  });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  const allowed = await canReadRecipe({ id: user.id, role: user.role }, recipe);
  if (!allowed) throw new Error("Keine Berechtigung");

  const list = await getOrCreateList(user.id);
  const scale = targetServings && targetServings > 0 ? targetServings / recipe.servings : 1;

  await prisma.shoppingItem.createMany({
    data: recipe.ingredients.map((ri) => ({
      listId: list.id,
      name: ri.ingredient.name,
      amount: ri.amount != null ? Math.round(ri.amount * scale * 100) / 100 : null,
      unit: ri.unit ?? null,
      recipeRef: recipe.title,
    })),
  });

  revalidatePath("/einkaufsliste");
  redirect("/einkaufsliste");
}

export async function toggleItemAction(itemId: string) {
  const user = await requireUser();
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item || item.list.ownerId !== user.id) throw new Error("Nicht gefunden");

  await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { checked: !item.checked },
  });
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${item.list.id}`);
}

export async function checkAllInGroupAction(listId: string, itemIds: string[]) {
  const user = await requireUser();
  const list = await prisma.shoppingList.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== user.id) throw new Error("Nicht gefunden");

  await prisma.shoppingItem.updateMany({
    where: { id: { in: itemIds }, listId },
    data: { checked: true },
  });
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}

export async function clearCheckedAction(listId: string) {
  const user = await requireUser();
  const list = await prisma.shoppingList.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== user.id) throw new Error("Nicht gefunden");

  await prisma.shoppingItem.deleteMany({ where: { listId, checked: true } });
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}

export async function clearListAction(listId: string) {
  const user = await requireUser();
  const list = await prisma.shoppingList.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== user.id) throw new Error("Nicht gefunden");

  await prisma.shoppingItem.deleteMany({ where: { listId } });
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}

export async function addManualItemAction(listId: string, formData: FormData) {
  const user = await requireUser();
  const list = await prisma.shoppingList.findUnique({ where: { id: listId } });
  if (!list || list.ownerId !== user.id) throw new Error("Nicht gefunden");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const amountRaw = String(formData.get("amount") ?? "");
  const amount = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
  const unit = String(formData.get("unit") ?? "").trim() || null;

  await prisma.shoppingItem.create({
    data: { listId, name, amount: Number.isFinite(amount!) ? amount : null, unit },
  });
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}
