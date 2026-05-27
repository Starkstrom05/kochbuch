import { prisma } from "@/lib/db/prisma";
import type { Actor } from "@/lib/cookbooks/permissions";

/**
 * Speiseplan-Sichtbarkeit nach der v0.22-Cookbook-Migration:
 *
 * - Owner sieht seinen Plan immer.
 * - ADMIN sieht jeden Plan.
 * - Wenn `familyShared` gesetzt ist, sieht den Plan jeder, der mit dem Owner
 *   mindestens ein Cookbook teilt (egal welche Richtung) — das ersetzt das
 *   alte `User.familyId === user.familyId`-Modell, das nach der Migration
 *   kaum noch greift, weil `familyId` nur per Admin-Aktion gesetzt wird.
 */
export type MealPlanForVisibility = {
  ownerId: string;
  familyShared: boolean;
};

export async function usersShareCookbook(userA: string, userB: string): Promise<boolean> {
  if (userA === userB) return true;
  const hit = await prisma.cookbook.findFirst({
    where: {
      OR: [
        { ownerId: userA, accesses: { some: { userId: userB } } },
        { ownerId: userB, accesses: { some: { userId: userA } } },
      ],
    },
    select: { id: true },
  });
  return hit !== null;
}

/**
 * Pure Sichtbarkeits-Entscheidung ohne DB-Lookup. `sharedCookbook` muss vom
 * Caller vorab ermittelt werden (z. B. via `usersShareCookbook`). Ermoeglicht
 * Unit-Tests ohne Prisma-Mock und teilt den Pfad mit `canViewMealPlan`.
 */
export function decideViewMealPlan(
  actor: Actor,
  plan: MealPlanForVisibility,
  sharedCookbook: boolean,
): boolean {
  if (actor.role === "ADMIN") return true;
  if (plan.ownerId === actor.id) return true;
  if (!plan.familyShared) return false;
  return sharedCookbook;
}

export async function canViewMealPlan(actor: Actor, plan: MealPlanForVisibility): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  if (plan.ownerId === actor.id) return true;
  if (!plan.familyShared) return false;
  return usersShareCookbook(actor.id, plan.ownerId);
}

/**
 * Liefert die IDs aller User, die mindestens ein Cookbook mit `actor` teilen
 * (in beide Richtungen). Für Listen-Queries, wo wir nicht pro Plan einzeln
 * `canViewMealPlan` aufrufen wollen.
 */
export async function cookbookSharingPeerIds(actor: Actor): Promise<string[]> {
  if (actor.role === "ADMIN") {
    const all = await prisma.user.findMany({
      where: { id: { not: actor.id } },
      select: { id: true },
    });
    return all.map((u) => u.id);
  }
  const ownedShares = await prisma.cookbookAccess.findMany({
    where: { cookbook: { ownerId: actor.id } },
    select: { userId: true },
  });
  const viewedShares = await prisma.cookbook.findMany({
    where: { accesses: { some: { userId: actor.id } } },
    select: { ownerId: true },
  });
  const set = new Set<string>();
  for (const s of ownedShares) set.add(s.userId);
  for (const c of viewedShares) set.add(c.ownerId);
  set.delete(actor.id);
  return Array.from(set);
}
