"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { buildShoppingItemsForEntries } from "@/lib/speiseplan/shopping-export";

async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  return session.user;
}

async function requirePlanOwner(planId: string, userId: string) {
  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan nicht gefunden");
  if (plan.ownerId !== userId) throw new Error("Keine Berechtigung");
  return plan;
}

export async function createMealPlanAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Name darf nicht leer sein");
  const firstDay = Number(formData.get("firstDay") ?? 1);
  const weekStart = new Date(String(formData.get("weekStart") ?? ""));
  if (isNaN(weekStart.getTime())) throw new Error("Ungültiges Datum");

  const plan = await prisma.mealPlan.create({
    data: { name, ownerId: user.id, firstDay, weekStart },
  });

  revalidatePath("/speiseplan");
  redirect(`/speiseplan/${plan.id}`);
}

export async function addMealEntryAction(
  planId: string,
  recipeId: string,
  dayIndex: number,
  mealType: string,
  servings: number,
) {
  const user = await requireUser();
  await requirePlanOwner(planId, user.id);

  const existingCount = await prisma.mealPlanEntry.count({ where: { planId, dayIndex } });

  await prisma.mealPlanEntry.create({
    data: { planId, recipeId, dayIndex, mealType, servings, order: existingCount },
  });

  revalidatePath(`/speiseplan/${planId}`);
}

export async function removeMealEntryAction(planId: string, entryId: string) {
  const user = await requireUser();
  await requirePlanOwner(planId, user.id);
  await prisma.mealPlanEntry.delete({ where: { id: entryId, planId } });
  revalidatePath(`/speiseplan/${planId}`);
}

export async function exportToShoppingListAction(
  planId: string,
  planName: string,
  entryIds: string[],
) {
  const user = await requireUser();
  await requirePlanOwner(planId, user.id);
  if (entryIds.length === 0) throw new Error("Keine Mahlzeiten ausgewählt");

  const rawItems = await buildShoppingItemsForEntries(entryIds);

  const list = await prisma.shoppingList.create({
    data: {
      name: planName,
      ownerId: user.id,
      items: {
        createMany: {
          data: rawItems.map((item) => ({
            name: item.name,
            amount: item.amount,
            unit: item.unit,
            recipeRef: item.recipeRef,
            checked: false,
          })),
        },
      },
    },
  });

  revalidatePath("/einkaufsliste");
  redirect(`/einkaufsliste/${list.id}`);
}

export async function deleteMealPlanAction(planId: string) {
  const user = await requireUser();
  await requirePlanOwner(planId, user.id);
  await prisma.mealPlan.delete({ where: { id: planId } });
  revalidatePath("/speiseplan");
  redirect("/speiseplan");
}
