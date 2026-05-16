-- RedefineTables
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
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("cookMinutes", "createdAt", "createdById", "description", "difficulty", "handwrittenPath", "id", "instructions", "isPublic", "notes", "prepMinutes", "servings", "shareToken", "slug", "sourceType", "sourceUrl", "tags", "title", "updatedAt") SELECT "cookMinutes", "createdAt", "createdById", "description", "difficulty", "handwrittenPath", "id", "instructions", "isPublic", "notes", "prepMinutes", "servings", "shareToken", "slug", "sourceType", "sourceUrl", "tags", "title", "updatedAt" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE UNIQUE INDEX "Recipe_shareToken_key" ON "Recipe"("shareToken");
CREATE INDEX "Recipe_createdById_idx" ON "Recipe"("createdById");
CREATE INDEX "Recipe_title_idx" ON "Recipe"("title");
CREATE INDEX "Recipe_sourceUrl_idx" ON "Recipe"("sourceUrl");
CREATE INDEX "Recipe_updatedAt_idx" ON "Recipe"("updatedAt");
CREATE INDEX "Recipe_isActive_idx" ON "Recipe"("isActive");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
