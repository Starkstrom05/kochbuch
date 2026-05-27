"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { canReadRecipe } from "@/lib/cookbooks/permissions";
import { requireUser } from "@/lib/auth/helpers";
import { buildShoppingItemsForEntries } from "@/lib/speiseplan/shopping-export";

const idSchema = z.string().min(1).max(64);
const MEAL_TYPES = ["Frühstück", "Mittagessen", "Abendessen", "Snack"] as const;

const createMealPlanSchema = z.object({
  name: z.string().trim().min(1).max(100),
  firstDay: z.number().int().min(1).max(7),
  weekStart: z.date(),
});

const mealEntrySchema = z.object({
  planId: idSchema,
  recipeId: idSchema,
  dayIndex: z.number().int().min(0).max(6),
  mealType: z.enum(MEAL_TYPES),
  servings: z.number().int().min(1).max(99),
});

const exportSchema = z.object({
  planId: idSchema,
  planName: z.string().trim().min(1).max(100),
  entryIds: z.array(idSchema).min(1).max(500),
});

async function requirePlanOwner(planId: string, userId: string) {
  const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan nicht gefunden");
  if (plan.ownerId !== userId) throw new Error("Keine Berechtigung");
  return plan;
}

export async function togglePlanShareAction(planId: string) {
  const user = await requireUser();
  const plan = await requirePlanOwner(planId, user.id);
  await prisma.mealPlan.update({
    where: { id: planId },
    data: { familyShared: !plan.familyShared },
  });
  revalidatePath("/speiseplan");
  revalidatePath(`/speiseplan/${planId}`);
}

export async function createMealPlanAction(formData: FormData) {
  const user = await requireUser();
  const parsed = createMealPlanSchema.parse({
    name: String(formData.get("name") ?? ""),
    firstDay: Number(formData.get("firstDay") ?? 1),
    weekStart: new Date(String(formData.get("weekStart") ?? "")),
  });

  const plan = await prisma.mealPlan.create({
    data: {
      name: parsed.name,
      ownerId: user.id,
      firstDay: parsed.firstDay,
      weekStart: parsed.weekStart,
    },
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
  const parsed = mealEntrySchema.parse({ planId, recipeId, dayIndex, mealType, servings });
  await requirePlanOwner(parsed.planId, user.id);

  const recipe = await prisma.recipe.findUnique({
    where: { id: parsed.recipeId },
    select: { cookbookId: true },
  });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  const allowed = await canReadRecipe({ id: user.id, role: user.role }, recipe);
  if (!allowed) throw new Error("Keine Berechtigung");

  const existingCount = await prisma.mealPlanEntry.count({
    where: { planId: parsed.planId, dayIndex: parsed.dayIndex },
  });

  await prisma.mealPlanEntry.create({
    data: {
      planId: parsed.planId,
      recipeId: parsed.recipeId,
      dayIndex: parsed.dayIndex,
      mealType: parsed.mealType,
      servings: parsed.servings,
      order: existingCount,
    },
  });

  revalidatePath(`/speiseplan/${parsed.planId}`);
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
  const parsed = exportSchema.parse({ planId, planName, entryIds });
  await requirePlanOwner(parsed.planId, user.id);

  const rawItems = await buildShoppingItemsForEntries(parsed.entryIds);

  const list = await prisma.shoppingList.create({
    data: {
      name: parsed.planName,
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
