-- FrequentItem: pro Liste statt pro User (ownerId -> listId).
--
-- Datenerhalt: bestehende „Häufig gekauft"-Historie wird auf die neueste eigene
-- Liste des jeweiligen Owners gemappt (Best-Effort). Items von Usern ohne eigene
-- Liste fallen weg (kein gültiges Ziel). Der Unique-Constraint bleibt heil, weil
-- pro User genau eine Ziel-Liste gewählt wird — keine [listId,name]-Kollision.
--
-- recipe_fts* (FTS5, per Raw-SQL verwaltet, nicht im Prisma-Schema) wird hier
-- bewusst NICHT angefasst — sonst zerstört der Tabellen-Rebuild die Volltextsuche.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_FrequentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrequentItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_FrequentItem" ("id", "listId", "name", "unit", "count", "lastUsedAt")
SELECT
    f."id",
    (SELECT s."id" FROM "ShoppingList" s WHERE s."ownerId" = f."ownerId" ORDER BY s."createdAt" DESC LIMIT 1),
    f."name", f."unit", f."count", f."lastUsedAt"
FROM "FrequentItem" f
WHERE EXISTS (SELECT 1 FROM "ShoppingList" s2 WHERE s2."ownerId" = f."ownerId");

DROP TABLE "FrequentItem";
ALTER TABLE "new_FrequentItem" RENAME TO "FrequentItem";
CREATE INDEX "FrequentItem_listId_idx" ON "FrequentItem"("listId");
CREATE UNIQUE INDEX "FrequentItem_listId_name_key" ON "FrequentItem"("listId", "name");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
