"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { canReadRecipe } from "@/lib/cookbooks/permissions";
import { requireUser } from "@/lib/auth/helpers";
import { planManualMerge } from "@/lib/shopping/merge";
import { attachCategories } from "@/lib/shopping/category-lookup";

const manualItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().finite().min(0).max(99999).nullable(),
  unit: z.string().trim().max(30).nullable(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

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

  const nameRaw = String(formData.get("name") ?? "").trim();
  if (!nameRaw) return;
  const amountRaw = String(formData.get("amount") ?? "");
  const amountParsed = amountRaw ? Number(amountRaw.replace(",", ".")) : null;
  const unitRaw = String(formData.get("unit") ?? "").trim() || null;

  const parsed = manualItemSchema.parse({
    name: nameRaw,
    amount: Number.isFinite(amountParsed as number) ? amountParsed : null,
    unit: unitRaw,
  });

  // Merge in ein bestehendes, noch nicht abgehaktes Item gleichen Namens statt
  // ein Duplikat anzulegen (consolidate.ts gruppiert sonst nur in der Anzeige).
  const open = await prisma.shoppingItem.findMany({
    where: { listId, checked: false },
    select: { id: true, name: true, amount: true, unit: true, checked: true },
  });
  const plan = planManualMerge(open, parsed);

  const row =
    plan.kind === "merge"
      ? await prisma.shoppingItem.update({
          where: { id: plan.targetId },
          data: { amount: plan.amount, unit: plan.unit },
        })
      : await prisma.shoppingItem.create({
          data: { listId, name: parsed.name, amount: parsed.amount, unit: parsed.unit },
        });

  // Kategorie für den fertigen Datensatz auflösen, damit der Client das Item
  // sofort im richtigen Gang einsortieren kann (statt erst nach Reload).
  const [item] = await attachCategories([
    {
      id: row.id,
      name: row.name,
      amount: row.amount,
      unit: row.unit,
      recipeRef: row.recipeRef,
      checked: row.checked,
    },
  ]);

  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
  return { merged: plan.kind === "merge", item };
}

const suggestQuerySchema = z.string().trim().min(2).max(50);

/**
 * Liefert bis zu 8 Zutaten-Namen für das Auto-Complete im manuellen Hinzufügen.
 * Case-insensitive (SQLite vergleicht default case-sensitive → LOWER-Roundtrip,
 * vgl. lib/pantry/server.ts). Präfix-Treffer vor Substring-Treffern, dann
 * alphabetisch. Nur lesend, keine Cookbook-Grenze nötig — Ingredient ist eine
 * globale, normalisierte Stammdaten-Tabelle ohne nutzerspezifische Inhalte.
 */
export async function suggestIngredientsAction(query: string): Promise<string[]> {
  await requireUser();
  const parsed = suggestQuerySchema.safeParse(query);
  if (!parsed.success) return [];

  const q = parsed.data.toLowerCase();
  const like = `%${q}%`;
  const prefix = `${q}%`;
  const rows = await prisma.$queryRaw<{ name: string }[]>(
    Prisma.sql`
      SELECT name FROM "Ingredient"
      WHERE LOWER(name) LIKE ${like}
      ORDER BY (LOWER(name) LIKE ${prefix}) DESC, name COLLATE NOCASE ASC
      LIMIT 8
    `,
  );
  return rows.map((r) => r.name);
}
