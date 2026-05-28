import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/shopping/permissions";
import { canManageShoppingList, canDeleteShoppingList } from "@/lib/shopping/permissions";

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
