import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/shopping/permissions";
import {
  canAccessShoppingList,
  canManageShoppingList,
  canDeleteShoppingList,
} from "@/lib/shopping/permissions";
import { targetListIdSchema } from "@/lib/shopping/target";

/**
 * Die neueste eigene Liste des Users oder eine frisch angelegte „Einkaufsliste".
 * Gemeinsamer Fallback für „→ Einkaufsliste" ohne explizites Ziel.
 */
export async function getOrCreateOwnList(userId: string) {
  const existing = await prisma.shoppingList.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing;
  return prisma.shoppingList.create({
    data: { name: "Einkaufsliste", ownerId: userId },
  });
}

/**
 * Löst die Ziel-Liste für „Rezept/Fehlende → Einkaufsliste" auf. Mit `listId`
 * muss die Liste zugänglich sein (Owner, Mitglied oder ADMIN) — sonst Fehler,
 * statt still in eine andere Liste zu schreiben. Ohne `listId`: neueste eigene
 * oder neu. Mitglieder geteilter Listen haben Vollzugriff, dürfen also auch dort
 * Items ergänzen.
 */
export async function resolveWriteTargetList(actor: Actor, listId?: string) {
  const parsed = listId ? targetListIdSchema.safeParse(listId) : null;
  if (parsed?.success) {
    if (!(await canAccessShoppingList(actor, parsed.data)))
      throw new Error("Keine Berechtigung für diese Liste");
    const list = await prisma.shoppingList.findUnique({ where: { id: parsed.data } });
    if (!list) throw new Error("Liste nicht gefunden");
    return list;
  }
  return getOrCreateOwnList(actor.id);
}

/**
 * Hebt ShoppingList.updatedAt an. Item-Mutationen (shoppingItem.*) triggern den
 * @updatedAt-Stempel der Liste nicht selbst — daher nach jeder Inhaltsänderung
 * explizit aufrufen. Treibt das Live-Update-Polling (Versionsstempel).
 */
export async function touchList(listId: string): Promise<void> {
  await prisma.shoppingList.update({
    where: { id: listId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Gibt eine Einkaufsliste für ein weiteres Mitglied frei. Nur Owner/Admin
 * (canManage). Mitglieder erhalten volle Inhalts-Bearbeitung. Idempotent.
 */
export async function shareShoppingList(actor: Actor, listId: string, memberUserId: string) {
  if (!(await canManageShoppingList(actor, listId))) throw new Error("Keine Berechtigung");
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });
  if (!list) throw new Error("Liste nicht gefunden");
  if (list.ownerId === memberUserId) throw new Error("Owner hat bereits Zugriff");
  return prisma.shoppingListAccess.upsert({
    where: { listId_userId: { listId, userId: memberUserId } },
    update: {},
    create: { listId, userId: memberUserId, grantedById: actor.id },
  });
}

/**
 * Entzieht einem Mitglied die Freigabe. Nur Owner/Admin. Kein activeCookbook-
 * Analogon nötig: /einkaufsliste zeigt immer die eigene neueste Liste, nie eine
 * fremde — ein ausgeschlossener User landet beim nächsten Aufruf im redirect.
 */
export async function revokeShoppingListShare(actor: Actor, listId: string, memberUserId: string) {
  if (!(await canManageShoppingList(actor, listId))) throw new Error("Keine Berechtigung");
  await prisma.shoppingListAccess
    .delete({ where: { listId_userId: { listId, userId: memberUserId } } })
    .catch(() => undefined);
}

/**
 * Löscht eine Liste komplett (Items + Freigaben cascaden). Nur Owner/Admin.
 * Keine „letzte Liste"-Sperre — getOrCreateList legt bei Bedarf neu an.
 */
export async function deleteShoppingList(actor: Actor, listId: string) {
  if (!(await canDeleteShoppingList(actor, listId))) throw new Error("Keine Berechtigung");
  await prisma.shoppingList.delete({ where: { id: listId } });
}
