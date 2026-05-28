"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { actorFromSession as actor } from "@/lib/auth/helpers";
import {
  shareShoppingList,
  revokeShoppingListShare,
  deleteShoppingList,
} from "@/lib/shopping/server";

export async function shareShoppingListAction(listId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("Kein Mitglied ausgewählt");
  await shareShoppingList(actor(session), listId, userId);
  revalidatePath(`/einkaufsliste/${listId}`);
  revalidatePath("/einkaufsliste/uebersicht");
}

export async function revokeShoppingListShareAction(listId: string, userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await revokeShoppingListShare(actor(session), listId, userId);
  revalidatePath(`/einkaufsliste/${listId}`);
  revalidatePath("/einkaufsliste/uebersicht");
}

export async function deleteShoppingListAction(listId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Nicht angemeldet");
  await deleteShoppingList(actor(session), listId);
  revalidatePath("/einkaufsliste/uebersicht");
  redirect("/einkaufsliste/uebersicht");
}
