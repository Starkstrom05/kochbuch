"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import {
  createRecipe as svCreate,
  updateRecipe as svUpdate,
  deleteRecipe as svDelete,
} from "@/lib/recipes/server";
import { downloadAndAttachCover } from "@/lib/recipes/cover";
import { recipeInputSchema } from "@/lib/schemas/recipe";

function parseIngredients(formData: FormData) {
  const names = formData.getAll("ing-name").map((v) => String(v));
  const amounts = formData.getAll("ing-amount").map((v) => String(v));
  const units = formData.getAll("ing-unit").map((v) => String(v));
  const notes = formData.getAll("ing-note").map((v) => String(v));

  return names
    .map((name, i) => {
      const amountRaw = amounts[i]?.replace(",", ".") ?? "";
      const amount = amountRaw === "" ? null : Number(amountRaw);
      return {
        name: name.trim(),
        amount: Number.isFinite(amount) ? (amount as number | null) : null,
        unit: units[i]?.trim() || null,
        note: notes[i]?.trim() || null,
      };
    })
    .filter((i) => i.name.length > 0);
}

function buildInput(formData: FormData) {
  return recipeInputSchema.parse({
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? "") || null,
    servings: Number(formData.get("servings") ?? 4) || 4,
    prepMinutes: formData.get("prepMinutes")
      ? Number(formData.get("prepMinutes"))
      : null,
    cookMinutes: formData.get("cookMinutes")
      ? Number(formData.get("cookMinutes"))
      : null,
    difficulty: formData.get("difficulty")
      ? Number(formData.get("difficulty"))
      : null,
    instructions: String(formData.get("instructions") ?? ""),
    notes: String(formData.get("notes") ?? "") || null,
    sourceUrl: String(formData.get("sourceUrl") ?? "") || null,
    sourceType: (formData.get("sourceType") as string) || "MANUAL",
    tags: String(formData.get("tags") ?? "") || null,
    categoryIds: formData.getAll("categoryIds").map((v) => String(v)),
    ingredients: parseIngredients(formData),
  });
}

export async function createRecipeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const input = buildInput(formData);
  const recipe = await svCreate(input, session.user.id);
  if (!recipe) throw new Error("Rezept konnte nicht erstellt werden");

  // Optional: Cover-URL aus dem Web-Import (RecipeEditor reicht sie als hidden
  // input durch). Best-effort — Fehler beim Bild-Download dürfen den Save nicht
  // verhindern, der User kann später scripts/backfill-covers.ts laufen lassen.
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  if (imageUrl) {
    try {
      await downloadAndAttachCover(recipe.id, imageUrl, input.sourceUrl ?? undefined);
    } catch (err) {
      console.error(
        `Cover-Download fuer ${recipe.id} fehlgeschlagen:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  revalidatePath("/rezepte");
  redirect(`/rezepte/${recipe.slug}`);
}

export async function updateRecipeAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const input = buildInput(formData);
  const recipe = await svUpdate(id, input, session.user.id);
  revalidatePath("/rezepte");
  revalidatePath(`/rezepte/${recipe.slug}`);
  redirect(`/rezepte/${recipe.slug}`);
}

export async function deleteRecipeAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await svDelete(id, session.user.id);
  revalidatePath("/rezepte");
  redirect("/rezepte");
}
