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
import { resolveWriteTargetList, touchList } from "@/lib/shopping/server";

const manualItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  amount: z.number().finite().min(0).max(99999).nullable(),
  unit: z.string().trim().max(30).nullable(),
});

const addRecipeToListSchema = z.object({
  recipeId: z.string().trim().min(1).max(64),
  listId: z.string().trim().min(1).max(64).optional(),
  targetServings: z.number().finite().positive().max(9999).optional(),
});

const checkAllInGroupSchema = z.object({
  listId: z.string().trim().min(1).max(64),
  itemIds: z.array(z.string().trim().min(1).max(64)).min(1).max(500),
});

// ── Actions ───────────────────────────────────────────────────────────────────

export async function addRecipeToListAction(
  recipeId: string,
  listId?: string,
  targetServings?: number,
) {
  const parsed = addRecipeToListSchema.parse({ recipeId, listId, targetServings });
  const user = await requireUser();

  const recipe = await prisma.recipe.findUnique({
    where: { id: parsed.recipeId },
    include: { ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } } },
  });
  if (!recipe) throw new Error("Rezept nicht gefunden");
  const allowed = await canReadRecipe({ id: user.id, role: user.role }, recipe);
  if (!allowed) throw new Error("Keine Berechtigung");

  const list = await resolveWriteTargetList({ id: user.id, role: user.role }, parsed.listId);
  const scale =
    parsed.targetServings && parsed.targetServings > 0
      ? parsed.targetServings / recipe.servings
      : 1;

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
  revalidatePath(`/einkaufsliste/${list.id}`);
  redirect(parsed.listId ? `/einkaufsliste/${list.id}` : "/einkaufsliste");
}

export async function toggleItemAction(itemId: string) {
  const user = await requireUser();
  const item = await prisma.shoppingItem.findUnique({
    where: { id: itemId },
    select: { listId: true },
  });
  if (!item) throw new Error("Nicht gefunden");
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, item.listId)))
    throw new Error("Nicht gefunden");

  // Atomares Toggle statt Read-Modify-Write: bei einem Doppel-Tap (zwei
  // fast gleichzeitigen Requests) würden sonst beide denselben alten
  // `checked`-Stand lesen und das Ergebnis des jeweils anderen überschreiben.
  // Ein einzelnes SQL-Statement kann das nicht — es gibt keinen Lesezeitpunkt,
  // der veralten könnte.
  await prisma.$executeRaw`UPDATE "ShoppingItem" SET checked = NOT checked WHERE id = ${itemId}`;
  await touchList(item.listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${item.listId}`);
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
  const parsed = checkAllInGroupSchema.parse({ listId, itemIds });
  const user = await requireUser();
  if (!(await canAccessShoppingList({ id: user.id, role: user.role }, parsed.listId)))
    throw new Error("Nicht gefunden");

  await prisma.shoppingItem.updateMany({
    where: { id: { in: parsed.itemIds }, listId: parsed.listId },
    data: { checked: true },
  });
  await touchList(parsed.listId);
  revalidatePath("/einkaufsliste");
  revalidatePath(`/einkaufsliste/${parsed.listId}`);
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
  // Read-Modify-Write in eine Transaktion gekapselt: zwei parallele Adds
  // desselben Namens ("Milch 1 l" + "Milch 1 l") dürfen nicht denselben
  // offenen Bestand lesen und dann beide mit dem alten Stand rechnen (sonst
  // 2 l statt 3 l, oder zwei separate Items statt einem gemergten). Der
  // Dummy-Write (touchList) ganz am Anfang holt sich sofort den
  // SQLite-Schreib-Lock für die gesamte Transaktion, sodass eine zweite,
  // parallel gestartete Transaktion erst NACH dem Commit dieser hier lesen
  // kann — kein stale Read mehr möglich.
  const { row, merged } = await prisma.$transaction(async (tx) => {
    await tx.shoppingList.update({
      where: { id: listId },
      data: { updatedAt: new Date() },
    });

    const open = await tx.shoppingItem.findMany({
      where: { listId, checked: false },
      select: { id: true, name: true, amount: true, unit: true, checked: true },
    });
    const plan = planManualMerge(open, input);

    const row =
      plan.kind === "merge"
        ? await tx.shoppingItem.update({
            where: { id: plan.targetId },
            data: { amount: plan.amount, unit: plan.unit },
          })
        : await tx.shoppingItem.create({
            data: { listId, name: input.name, amount: input.amount, unit: input.unit },
          });

    return { row, merged: plan.kind === "merge" };
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

  return { merged, item };
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
  await recordFrequentItem(listId, parsed.name, parsed.unit);

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
  await recordFrequentItem(listId, parsed, null);

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
