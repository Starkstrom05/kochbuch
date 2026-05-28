import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/cookbooks/permissions";

export type { Actor };

type ListForAccessDecision = {
  ownerId: string;
  memberIds: string[];
};

/**
 * Pure Zugriffs-Entscheidung ohne DB. Owner, eingetragenes Mitglied oder ADMIN
 * dürfen die Liste lesen UND bearbeiten (Items hinzufügen/abhaken/notieren) —
 * geteilte Mitglieder haben volle Inhalts-Rechte, anders als Cookbook-Viewer.
 */
export function decideAccessShoppingList(actor: Actor, list: ListForAccessDecision): boolean {
  if (actor.role === "ADMIN") return true;
  if (list.ownerId === actor.id) return true;
  return list.memberIds.includes(actor.id);
}

/**
 * Pure Verwaltungs-Entscheidung: nur Owner oder ADMIN dürfen Freigaben vergeben/
 * entziehen und die Liste löschen. Mitglieder explizit NICHT.
 */
export function decideManageShoppingList(actor: Actor, list: { ownerId: string }): boolean {
  if (actor.role === "ADMIN") return true;
  return list.ownerId === actor.id;
}

/**
 * Owner, eingetragenes Mitglied oder ADMIN dürfen die Liste sehen und ihren
 * Inhalt bearbeiten.
 */
export async function canAccessShoppingList(actor: Actor, listId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: {
      ownerId: true,
      accesses: { where: { userId: actor.id }, select: { userId: true } },
    },
  });
  if (!list) return false;
  return decideAccessShoppingList(actor, {
    ownerId: list.ownerId,
    memberIds: list.accesses.map((a) => a.userId),
  });
}

/**
 * Owner oder ADMIN dürfen Freigaben verwalten und die Liste löschen.
 */
export async function canManageShoppingList(actor: Actor, listId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { ownerId: true },
  });
  return list ? decideManageShoppingList(actor, list) : false;
}

/** Löschen = Verwalten (Owner oder ADMIN). Eigener Name für lesbare Call-Sites. */
export async function canDeleteShoppingList(actor: Actor, listId: string): Promise<boolean> {
  return canManageShoppingList(actor, listId);
}

/** Alle Listen-IDs, auf die der User zugreifen darf (eigene + geteilte). */
export async function accessibleListIds(actor: Actor): Promise<string[]> {
  if (actor.role === "ADMIN") {
    const all = await prisma.shoppingList.findMany({ select: { id: true } });
    return all.map((l) => l.id);
  }
  const lists = await prisma.shoppingList.findMany({
    where: {
      OR: [{ ownerId: actor.id }, { accesses: { some: { userId: actor.id } } }],
    },
    select: { id: true },
  });
  return lists.map((l) => l.id);
}

export type AccessibleList = {
  id: string;
  name: string;
  ownerId: string;
  owner: { id: string; name: string };
  itemCount: number;
  isOwn: boolean;
};

/**
 * Listen, die der User sehen darf, mit Metadaten für die Übersicht. Eigene
 * zuerst, dann alphabetisch (deutsche Sortierung). Analog listReadableCookbooks.
 */
export async function listAccessibleLists(actor: Actor): Promise<AccessibleList[]> {
  const where =
    actor.role === "ADMIN"
      ? {}
      : { OR: [{ ownerId: actor.id }, { accesses: { some: { userId: actor.id } } }] };

  const lists = await prisma.shoppingList.findMany({
    where,
    select: {
      id: true,
      name: true,
      ownerId: true,
      owner: { select: { id: true, name: true } },
      _count: { select: { items: true } },
    },
  });

  return lists
    .map((l) => ({
      id: l.id,
      name: l.name,
      ownerId: l.ownerId,
      owner: l.owner,
      itemCount: l._count.items,
      isOwn: l.ownerId === actor.id,
    }))
    .sort((a, b) => {
      if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
      return a.name.localeCompare(b.name, "de");
    });
}
