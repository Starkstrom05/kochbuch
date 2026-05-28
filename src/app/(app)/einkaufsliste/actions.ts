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
import { recordFrequentItem } from "@/lib/shopping/frequent";
import { canAccessShoppingList } from "@/lib/shopping/permissions";
import { touchList } from "@/lib/shopping/server";

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

  await touchList(list.id);
  revalidatePath("/einkaufsliste");
  redirect("/einkaufsliste");
}

export async function toggleItemAction(itemId: string) {
  const user = await requireUser();
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item) throw new Error("Nicht gefunden");
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, item.listId)))
    throw new Error("Nicht gefunden");

  await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { checked: !item.checked },
  });
  await touchList(item.listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${item.list.id}`);
}

const noteSchema = z.string().trim().max(200);

export async function setItemNoteAction(itemId: string, note: string) {
  const user = await requireUser();
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    include: { list: true },
  });
  if (!item) throw new Error("Nicht gefunden");
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, item.listId)))
    throw new Error("Nicht gefunden");

  const trimmed = noteSchema.parse(note);
  await prisma.shoppingItem.update({
    where: { id: itemId },
    data: { note: trimmed || null },
  });
  await touchList(item.listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${item.listId}`);
}

export async function checkAllInGroupAction(listId: string, itemIds: string[]) {
  const user = await requireUser();
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, listId)))
    throw new Error("Nicht gefunden");

  await prisma.shoppingItem.updateMany({
    where: { id: { in: itemIds }, listId },
    data: { checked: true },
  });
  await touchList(listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}

export async function clearCheckedAction(listId: string) {
  const user = await requireUser();
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, listId)))
    throw new Error("Nicht gefunden");

  await prisma.shoppingItem.deleteMany({ where: { listId, checked: true } });
  await touchList(listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}

export async function clearListAction(listId: string) {
  const user = await requireUser();
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, listId)))
    throw new Error("Nicht gefunden");

  await prisma.shoppingItem.deleteMany({ where: { listId } });
  await touchList(listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
}

/**
 * Legt ein Item in der Liste an — mit Merge in ein bestehendes, noch nicht
 * abgehaktes Item gleichen Namens (consolidate.ts gruppiert sonst nur in der
 * Anzeige) und mit aufgelöster Gang-Kategorie, damit der Client es sofort
 * richtig einsortiert. Gemeinsamer Pfad für manuelles + Master-List-Hinzufügen.
 */
async function addItemToList(
  listId: string,
  input: { name: string; amount: number | null; unit: string | null },
) {
  const open = await prisma.shoppingItem.findMany({
    where: { listId, checked: false },
    select: { id: true, name: true, amount: true, unit: true, checked: true },
  });
  const plan = planManualMerge(open, input);

  const row =
    plan.kind === "merge"
      ? await prisma.shoppingItem.update({
          where: { id: plan.targetId },
          data: { amount: plan.amount, unit: plan.unit },
        })
      : await prisma.shoppingItem.create({
          data: { listId, name: input.name, amount: input.amount, unit: input.unit },
        });

  const [item] = await attachCategories([
    {
      id: row.id,
      name: row.name,
      amount: row.amount,
      unit: row.unit,
      recipeRef: row.recipeRef,
      checked: row.checked,
      note: row.note,
    },
  ]);

  await touchList(listId);
  return { merged: plan.kind === "merge", item };
}

export async function addManualItemAction(listId: string, formData: FormData) {
  const user = await requireUser();
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, listId)))
    throw new Error("Nicht gefunden");

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

  const result = await addItemToList(listId, parsed);
  await recordFrequentItem(user.id, parsed.name, parsed.unit);

  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
  return result;
}

const frequentNameSchema = z.string().trim().min(1).max(200);

/**
 * 1-Tap aus der „Häufig gekauft"-Liste: fügt den Namen (ohne Menge) zur Liste
 * hinzu und zählt ihn erneut in die Historie. Nutzt denselben Merge-/Kategorie-
 * Pfad wie das manuelle Hinzufügen.
 */
export async function addFrequentItemAction(listId: string, name: string) {
  const user = await requireUser();
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, listId)))
    throw new Error("Nicht gefunden");

  const parsed = frequentNameSchema.parse(name);
  const result = await addItemToList(listId, { name: parsed, amount: null, unit: null });
  await recordFrequentItem(user.id, parsed, null);

  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${listId}`);
  return result;
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
