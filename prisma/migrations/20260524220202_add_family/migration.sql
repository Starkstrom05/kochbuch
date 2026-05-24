-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "coverImagePath" TEXT,
    "accentColor" TEXT,
    "inkColor" TEXT,
    "paperColor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "visibility" TEXT NOT NULL DEFAULT 'SHARED',
    "familyId" TEXT,
    "nutritionKcal" REAL,
    "nutritionProteinG" REAL,
    "nutritionCarbsG" REAL,
    "nutritionFatG" REAL,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("cookMinutes", "createdAt", "createdById", "description", "difficulty", "handwrittenPath", "id", "instructions", "isActive", "isPublic", "notes", "nutritionCarbsG", "nutritionFatG", "nutritionKcal", "nutritionProteinG", "prepMinutes", "servings", "shareToken", "slug", "sourceType", "sourceUrl", "tags", "title", "updatedAt") SELECT "cookMinutes", "createdAt", "createdById", "description", "difficulty", "handwrittenPath", "id", "instructions", "isActive", "isPublic", "notes", "nutritionCarbsG", "nutritionFatG", "nutritionKcal", "nutritionProteinG", "prepMinutes", "servings", "shareToken", "slug", "sourceType", "sourceUrl", "tags", "title", "updatedAt" FROM "Recipe";
DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE UNIQUE INDEX "Recipe_shareToken_key" ON "Recipe"("shareToken");
CREATE INDEX "Recipe_createdById_idx" ON "Recipe"("createdById");
CREATE INDEX "Recipe_title_idx" ON "Recipe"("title");
CREATE INDEX "Recipe_sourceUrl_idx" ON "Recipe"("sourceUrl");
CREATE INDEX "Recipe_updatedAt_idx" ON "Recipe"("updatedAt");
CREATE INDEX "Recipe_isActive_idx" ON "Recipe"("isActive");
CREATE INDEX "Recipe_familyId_idx" ON "Recipe"("familyId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "familyId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "id", "name", "passwordHash", "role") SELECT "createdAt", "email", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_familyId_idx" ON "User"("familyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- Backfill: bestehende Daten in eine Default-Familie überführen (Name aus
-- AppMeta.appName, Fallback "Familie"). Recipe.visibility bleibt per Default
-- 'SHARED' → bisheriges "alle sehen alles"-Verhalten bleibt erhalten.
INSERT INTO "Family" ("id", "name", "createdAt")
VALUES ('default-family', COALESCE((SELECT "value" FROM "AppMeta" WHERE "key" = 'appName'), 'Familie'), CURRENT_TIMESTAMP);
UPDATE "User" SET "familyId" = 'default-family' WHERE "familyId" IS NULL;
UPDATE "Recipe" SET "familyId" = 'default-family' WHERE "familyId" IS NULL;
