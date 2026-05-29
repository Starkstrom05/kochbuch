-- Category: an Cookbook statt Family gebunden (familyId -> cookbookId).
--
-- Bestehende familien-spezifische Kategorien werden global (cookbookId = NULL),
-- da es kein direktes Family->Cookbook-Mapping gibt. Niemand verliert dadurch
-- Zugriff — globale Kategorien sind in jedem Cookbook sichtbar. In der Praxis war
-- familyId ohnehin fast immer null (Family ist seit v0.22 Legacy).
--
-- recipe_fts* (FTS5, per Raw-SQL verwaltet, nicht im Prisma-Schema) bewusst NICHT
-- angefasst — sonst zerstört der Tabellen-Rebuild die Volltextsuche.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "cookbookId" TEXT,
    CONSTRAINT "Category_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
-- familyId wird bewusst nicht übernommen -> cookbookId bleibt NULL (global).
INSERT INTO "new_Category" ("icon", "id", "name") SELECT "icon", "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "Category_cookbookId_idx" ON "Category"("cookbookId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
