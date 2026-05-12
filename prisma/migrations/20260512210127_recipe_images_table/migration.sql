-- CreateTable
CREATE TABLE "RecipeImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecipeImage_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "RecipeImage_recipeId_order_idx" ON "RecipeImage"("recipeId", "order");

-- Data migration: move existing Recipe.coverImagePath into RecipeImage rows.
-- cuid-like ID via SQLite-internal randomblob; for our purposes any unique 24-char
-- hex string is fine (the app never inspects the format).
INSERT INTO "RecipeImage" ("id", "recipeId", "path", "order", "createdAt")
SELECT
    'm' || lower(hex(randomblob(12))),
    "id",
    "coverImagePath",
    0,
    CURRENT_TIMESTAMP
FROM "Recipe"
WHERE "coverImagePath" IS NOT NULL;

-- Drop coverImagePath column via SQLite table-rebuild.
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
    "shareToken" TEXT,
    "tags" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Recipe" (
    "id", "title", "slug", "description", "servings", "prepMinutes", "cookMinutes",
    "difficulty", "sourceUrl", "sourceType", "instructions", "notes",
    "handwrittenPath", "isPublic", "shareToken", "tags", "createdById",
    "createdAt", "updatedAt"
)
SELECT
    "id", "title", "slug", "description", "servings", "prepMinutes", "cookMinutes",
    "difficulty", "sourceUrl", "sourceType", "instructions", "notes",
    "handwrittenPath", "isPublic", "shareToken", "tags", "createdById",
    "createdAt", "updatedAt"
FROM "Recipe";

DROP TABLE "Recipe";
ALTER TABLE "new_Recipe" RENAME TO "Recipe";

CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");
CREATE UNIQUE INDEX "Recipe_shareToken_key" ON "Recipe"("shareToken");
CREATE INDEX "Recipe_createdById_idx" ON "Recipe"("createdById");
CREATE INDEX "Recipe_title_idx" ON "Recipe"("title");
CREATE INDEX "Recipe_sourceUrl_idx" ON "Recipe"("sourceUrl");
CREATE INDEX "Recipe_updatedAt_idx" ON "Recipe"("updatedAt");

PRAGMA foreign_keys=ON;
