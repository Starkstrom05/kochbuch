"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import {
  createRecipe as svCreate,
  updateRecipe as svUpdate,
  deactivateRecipe as svDeactivate,
  restoreRecipe as svRestore,
  permanentlyDeleteRecipe as svPermanentlyDelete,
} from "@/lib/recipes/server";
import {
  addImageFromBuffer,
  addImageFromUrl,
  clearAllImages,
  reconcileImages,
} from "@/lib/recipes/images";
import { MAX_UPLOAD_BYTES } from "@/lib/images/upload";
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

// Bilder-Handling aus FormData:
//   - keepImageId[]:  IDs bestehender Bilder in gewuenschter Reihenfolge (Update)
//   - newImage[]:     neu hochgeladene Dateien (multipart File-Inputs)
//   - imageUrl[]:     URLs aus Web-Import (werden runtergeladen)
//   - clearImages=1:  Sentinel: alle Bilder loeschen (nur beim Update relevant)
// Beim Create gibt es noch keine existierenden Bilder; keepImageId wird ignoriert.
// Fehler beim Bild-Upload werden geloggt, aber stoppen den Save nicht.
async function processImagesFromFormData(
  recipeId: string,
  formData: FormData,
  sourceUrl: string | null,
  isUpdate: boolean,
) {
  if (isUpdate) {
    if (formData.get("clearImages") === "1") {
      await clearAllImages(recipeId);
    } else {
      const keepIds = formData
        .getAll("keepImageId")
        .map((v) => String(v))
        .filter(Boolean);
      await reconcileImages(recipeId, keepIds);
    }
  }

  const newFiles = formData
    .getAll("newImage")
    .filter((v): v is File => v instanceof File && v.size > 0);
  for (const file of newFiles) {
    if (file.size > MAX_UPLOAD_BYTES) {
      console.error(`Bild-Upload fuer ${recipeId} abgelehnt: ${file.name} zu groß`);
      continue;
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      await addImageFromBuffer(recipeId, buffer);
    } catch (err) {
      console.error(
        `Bild-Upload fuer ${recipeId} fehlgeschlagen:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const importUrls = formData
    .getAll("imageUrl")
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (importUrls.length > 0) {
    console.log(
      `[image-import] ${recipeId}: ${importUrls.length} URL(s), sourceUrl=${sourceUrl ?? "(none)"}`,
    );
  }
  for (const url of importUrls) {
    try {
      const res = await addImageFromUrl(recipeId, url, {
        baseUrl: sourceUrl ?? undefined,
      });
      console.log(`[image-import] ${recipeId}: OK ${url} → ${res.path}`);
    } catch (err) {
      console.error(
        `[image-import] ${recipeId}: FAIL ${url}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

export async function createRecipeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const input = buildInput(formData);
  const recipe = await svCreate(input, session.user.id);
  if (!recipe) throw new Error("Rezept konnte nicht erstellt werden");
  await processImagesFromFormData(recipe.id, formData, input.sourceUrl ?? null, false);
  revalidatePath("/rezepte");
  redirect(`/rezepte/${recipe.slug}`);
}

export async function updateRecipeAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const input = buildInput(formData);
  const recipe = await svUpdate(id, input, session.user.id);
  if (!recipe) throw new Error("Rezept konnte nicht aktualisiert werden");
  await processImagesFromFormData(recipe.id, formData, input.sourceUrl ?? null, true);
  revalidatePath("/rezepte");
  revalidatePath(`/rezepte/${recipe.slug}`);
  redirect(`/rezepte/${recipe.slug}`);
}

export async function deactivateRecipeAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await svDeactivate(id, session.user.id);
  revalidatePath("/rezepte");
  revalidatePath("/rezepte/archiv");
  redirect("/rezepte");
}

export async function restoreRecipeAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await svRestore(id, session.user.id);
  revalidatePath("/rezepte");
  revalidatePath("/rezepte/archiv");
}

export async function permanentlyDeleteRecipeAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await svPermanentlyDelete(id, session.user.id);
  revalidatePath("/rezepte/archiv");
}
