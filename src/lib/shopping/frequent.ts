import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { FrequentEntry } from "./master-list";

/**
 * Zählt einen Add in die „Häufig gekauft"-Historie der Liste. Pro Liste (nicht
 * pro User), damit alle Mitglieder einer geteilten Liste dieselben Vorschläge
 * sehen. Case-insensitive dedupliziert über einen LOWER-Lookup (SQLite
 * vergleicht default case-sensitive, vgl. lib/pantry/server.ts). count steigt,
 * lastUsedAt und die zuletzt genutzte Einheit werden aktualisiert.
 */
export async function recordFrequentItem(
  listId: string,
  rawName: string,
  unit: string | null,
): Promise<void> {
  const name = rawName.trim();
  if (!name) return;
  const lowered = name.toLowerCase();
  const hits = await prisma.$queryRaw<{ id: string }[]>(
    Prisma.sql`SELECT id FROM "FrequentItem" WHERE "listId" = ${listId} AND LOWER(name) = ${lowered} LIMIT 1`,
  );
  if (hits[0]) {
    await prisma.frequentItem.update({
      where: { id: hits[0].id },
      data: { count: { increment: 1 }, lastUsedAt: new Date(), unit },
    });
  } else {
    await prisma.frequentItem.create({ data: { listId, name, unit } });
  }
}

/** Häufigste Items einer Liste, sortiert nach count DESC, dann Aktualität. */
export async function getFrequentItems(listId: string, take = 40): Promise<FrequentEntry[]> {
  return prisma.frequentItem.findMany({
    where: { listId },
    orderBy: [{ count: "desc" }, { lastUsedAt: "desc" }],
    take,
    select: { name: true, unit: true, count: true },
  });
}
