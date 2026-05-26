-- CreateTable
CREATE TABLE "Cookbook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "coverImagePath" TEXT,
    "accentColor" TEXT,
    "inkColor" TEXT,
    "paperColor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cookbook_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CookbookAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cookbookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookbookAccess_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookbookAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookbookAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "cookbookId" TEXT,
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
    CONSTRAINT "Recipe_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recipe_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recipe_importedFromRecipeId_fkey" FOREIGN KEY ("importedFromRecipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Recipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Recipe" ("cookMinutes", "createdAt", "createdById", "description", "difficulty", "familyId", "handwrittenPath", "id", "instructions", "isActive", "isPublic", "notes", "nutritionCarbsG", "nutritionFatG", "nutritionKcal", "nutritionProteinG", "prepMinutes", "servings", "shareToken", "slug", "sourceType", "sourceUrl", "tags", "title", "updatedAt", "visibility") SELECT "cookMinutes", "createdAt", "createdById", "description", "difficulty", "familyId", "handwrittenPath", "id", "instructions", "isActive", "isPublic", "notes", "nutritionCarbsG", "nutritionFatG", "nutritionKcal", "nutritionProteinG", "prepMinutes", "servings", "shareToken", "slug", "sourceType", "sourceUrl", "tags", "title", "updatedAt", "visibility" FROM "Recipe";
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
CREATE INDEX "Recipe_cookbookId_idx" ON "Recipe"("cookbookId");
CREATE INDEX "Recipe_importedFromRecipeId_idx" ON "Recipe"("importedFromRecipeId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "familyId" TEXT,
    "activeCookbookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_activeCookbookId_fkey" FOREIGN KEY ("activeCookbookId") REFERENCES "Cookbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "familyId", "id", "name", "passwordHash", "role") SELECT "createdAt", "email", "familyId", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_familyId_idx" ON "User"("familyId");
CREATE INDEX "User_activeCookbookId_idx" ON "User"("activeCookbookId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Cookbook_ownerId_idx" ON "Cookbook"("ownerId");

-- CreateIndex
CREATE INDEX "CookbookAccess_userId_idx" ON "CookbookAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CookbookAccess_cookbookId_userId_key" ON "CookbookAccess"("cookbookId", "userId");

-- Backfill: pro existierendem User ein Cookbook anlegen, Rezepte verknuepfen.
-- SQLite kann keine Prisma-CUIDs erzeugen; wir nutzen ein deterministisches
-- Praefix + Random-Hex, damit IDs eindeutig und vom Cuid-Format unterscheidbar
-- bleiben (24 zusaetzliche Hex-Zeichen = 96 Bits Entropie).
INSERT INTO "Cookbook" ("id", "ownerId", "name", "createdAt", "updatedAt")
SELECT 'ckb' || lower(hex(randomblob(12))) AS "id",
       "id" AS "ownerId",
       "name" || ' Kochbuch' AS "name",
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "User";

-- Eigene Rezepte ins Cookbook des Erstellers verschieben.
UPDATE "Recipe"
SET "cookbookId" = (
  SELECT "id" FROM "Cookbook" WHERE "Cookbook"."ownerId" = "Recipe"."createdById" LIMIT 1
)
WHERE "cookbookId" IS NULL;

-- Fallback fuer Rezepte ohne passenden Owner-Cookbook (sollte nach obigem
-- INSERT eigentlich nie greifen, aber sicher ist sicher): ans Cookbook des
-- ersten Admin-Users haengen.
UPDATE "Recipe"
SET "cookbookId" = (
  SELECT "id" FROM "Cookbook"
  WHERE "ownerId" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1)
  LIMIT 1
)
WHERE "cookbookId" IS NULL;

-- Active Cookbook pro User auf das eigene setzen.
UPDATE "User"
SET "activeCookbookId" = (
  SELECT "id" FROM "Cookbook" WHERE "Cookbook"."ownerId" = "User"."id" LIMIT 1
)
WHERE "activeCookbookId" IS NULL;
