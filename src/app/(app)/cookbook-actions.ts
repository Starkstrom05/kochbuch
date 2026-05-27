"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import {
  cloneRecipe,
  createCookbook,
  deleteCookbook,
  renameCookbook,
  revokeCookbookShare,
  setActiveCookbook,
  shareCookbook,
  updateCookbookBranding,
  type CookbookBrandingInput,
} from "@/lib/cookbooks/server";
import { actorFromSession as actor } from "@/lib/auth/helpers";

export async function setActiveCookbookAction(cookbookId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await setActiveCookbook(actor(session), cookbookId);
  // Switcher veraendert sichtbare Listen ueberall — Layout-weit revalidieren.
  revalidatePath("/", "layout");
  return { activeCookbookId: cookbookId };
}

export async function createCookbookAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const name = String(formData.get("name") ?? "");
  const cookbook = await createCookbook(actor(session), name);
  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return { id: cookbook.id };
}

export async function renameCookbookAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const name = String(formData.get("name") ?? "");
  await renameCookbook(actor(session), id, name);
  revalidatePath("/profil");
  revalidatePath("/", "layout");
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
function parseColor(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return HEX_COLOR.test(s) ? s.toLowerCase() : null;
}

export async function updateCookbookBrandingAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const useColors = formData.get("customColors") === "on";
  const branding: CookbookBrandingInput = {
    coverImagePath: null,
    accentColor: useColors ? parseColor(formData.get("accentColor")) : null,
    inkColor: useColors ? parseColor(formData.get("inkColor")) : null,
    paperColor: useColors ? parseColor(formData.get("paperColor")) : null,
  };
  await updateCookbookBranding(actor(session), id, branding);
  revalidatePath("/profil");
  revalidatePath("/", "layout");
}

export async function deleteCookbookAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await deleteCookbook(actor(session), id);
  revalidatePath("/profil");
  revalidatePath("/", "layout");
}

export async function shareCookbookAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Kein User ausgewaehlt");
  await shareCookbook(actor(session), id, userId);
  revalidatePath("/profil");
  revalidatePath("/", "layout");
}

export async function revokeCookbookShareAction(id: string, userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await revokeCookbookShare(actor(session), id, userId);
  revalidatePath("/profil");
  revalidatePath("/", "layout");
}

/**
 * Klont ein Rezept in das aktuell aktive Cookbook des Users und leitet auf
 * den neuen Slug weiter.
 */
export async function cloneRecipeAction(sourceRecipeId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  if (!session.user.activeCookbookId) throw new Error("Kein aktives Kochbuch");
  const created = await cloneRecipe(actor(session), sourceRecipeId, session.user.activeCookbookId);
  revalidatePath("/rezepte");
  redirect(`/rezepte/${created.slug}`);
}
