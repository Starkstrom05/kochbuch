-- Phase C: cookbookId wird Pflichtfeld; Legacy-Mandantenspalten droppen.
-- Voraussetzung: Phase A hat alle Recipes mit cookbookId verknuepft (Backfill).
-- Bei SQLite werden NOT NULL- und Spalten-Drop-Aenderungen via Table-Rebuild
-- umgesetzt.

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "servings" INTEGER NOT NULL DEFAULT 4,
    "prepMinutes" INTEGER,
    "cookMinutes" INTEGER,
    "difficulty" INTEGER,
    "sourceUrl" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "instructions" TEXT NOT NULL,
    "notes" TEXT,
    "handwrittenPath" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shareToken" TEXT,
    "tags" TEXT,
    "cookbookId" TEXT NOT NULL,
    "importedFromRecipeId" TEXT,
    "importedFromCookbookId" TEXT,
    "importedFromUserId" TEXT,
    "nutritionKcal" REAL,
    "nutritionProteinG" REAL,
    "nutritionCarbsG" REAL,
    "nutritionFatG" REAL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recipe_importedFromRecipeId_fkey" FOREIGN KEY ("importedFromRecipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Recipe" (
    "id", "title", "slug", "description", "servings", "prepMinutes", "cookMinutes",
    "difficulty", "sourceUrl", "sourceType", "instructions", "notes", "handwrittenPath",
    "isPublic", "isActive", "shareToken", "tags", "cookbookId",
    "importedFromRecipeId", "importedFromCookbookId", "importedFromUserId",
    "nutritionKcal", "nutritionProteinG", "nutritionCarbsG", "nutritionFatG",
    "createdById", "createdAt", "updatedAt"
)
SELECT
    "id", "title", "slug", "description", "servings", "prepMinutes", "cookMinutes",
    "difficulty", "sourceUrl", "sourceType", "instructions", "notes", "handwrittenPath",
    "isPublic", "isActive", "shareToken", "tags", "cookbookId",
    "importedFromRecipeId", "importedFromCookbookId", "importedFromUserId",
    "nutritionKcal", "nutritionProteinG", "nutritionCarbsG", "nutritionFatG",
    "createdById", "createdAt", "updatedAt"
FROM "Recipe";

DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";

CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE UNIQUE INDEX "Recipe_shareToken_key" ON "Recipe"("shareToken");
CREATE INDEX "Recipe_createdById_idx" ON "Recipe"("createdById");
CREATE INDEX "Recipe_title_idx" ON "Recipe"("title");
CREATE INDEX "Recipe_sourceUrl_idx" ON "Recipe"("sourceUrl");
CREATE INDEX "Recipe_updatedAt_idx" ON "Recipe"("updatedAt");
CREATE INDEX "Recipe_isActive_idx" ON "Recipe"("isActive");
CREATE INDEX "Recipe_cookbookId_idx" ON "Recipe"("cookbookId");
CREATE INDEX "Recipe_importedFromRecipeId_idx" ON "Recipe"("importedFromRecipeId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
