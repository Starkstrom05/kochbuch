-- Review-Fixes: onDelete-Cascades + Category-Scoping + fehlende Indizes.
--
-- Diese Migration wurde ueber `prisma migrate diff --from-config-datasource
-- --to-schema=prisma/schema.prisma --script` erzeugt (nicht `migrate dev`),
-- weil die lokale dev.db wegen einer historischen Rollback/Reapply-Sequenz
-- der Migration `20260528234615_add_shopping_list_updated_at` einen
-- Drift-Check von `migrate dev` ausloeste, der einen vollstaendigen
-- Datenbank-Reset verlangt haette (`migrate status` bestaetigt: kein
-- tatsaechlicher Drift, die zuletzt angewandte Checksumme stimmt).
--
-- WICHTIG: Der Rohdiff enthielt zusaetzlich `DROP TABLE recipe_fts` +
-- die 4 FTS5-Shadow-Tabellen (`recipe_fts_config/_data/_docsize/_idx`),
-- weil diese virtuellen Tabellen (aus der manuellen Migration
-- 20260527203100_add_recipe_fts5) nicht Teil des Prisma-Datenmodells sind
-- und daher als "extra" erkannt werden. Diese Drop-Statements wurden HIER
-- BEWUSST ENTFERNT, um den Volltext-Index nicht zu zerstoeren.
--
-- Kein Dedup/Backfill noetig: vor Erstellung dieser Migration wurde die
-- dev.db per Skript auf doppelte (cookbookId, name)-Paare in Category
-- geprueft — keine Duplikate vorhanden.

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "cookbookId" TEXT,
    CONSTRAINT "Category_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("cookbookId", "icon", "id", "name") SELECT "cookbookId", "icon", "id", "name" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE INDEX "Category_cookbookId_idx" ON "Category"("cookbookId");
CREATE UNIQUE INDEX "Category_cookbookId_name_key" ON "Category"("cookbookId", "name");
CREATE TABLE "new_CookbookAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cookbookId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CookbookAccess_cookbookId_fkey" FOREIGN KEY ("cookbookId") REFERENCES "Cookbook" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookbookAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CookbookAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CookbookAccess" ("cookbookId", "grantedAt", "grantedById", "id", "userId") SELECT "cookbookId", "grantedAt", "grantedById", "id", "userId" FROM "CookbookAccess";
DROP TABLE "CookbookAccess";
ALTER TABLE "new_CookbookAccess" RENAME TO "CookbookAccess";
CREATE INDEX "CookbookAccess_userId_idx" ON "CookbookAccess"("userId");
CREATE UNIQUE INDEX "CookbookAccess_cookbookId_userId_key" ON "CookbookAccess"("cookbookId", "userId");
CREATE TABLE "new_Rating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Rating" ("comment", "createdAt", "id", "recipeId", "stars", "userId") SELECT "comment", "createdAt", "id", "recipeId", "stars", "userId" FROM "Rating";
DROP TABLE "Rating";
ALTER TABLE "new_Rating" RENAME TO "Rating";
CREATE INDEX "Rating_userId_idx" ON "Rating"("userId");
CREATE UNIQUE INDEX "Rating_recipeId_userId_key" ON "Rating"("recipeId", "userId");
CREATE TABLE "new_ShoppingList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShoppingList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ShoppingList" ("createdAt", "id", "name", "ownerId", "updatedAt") SELECT "createdAt", "id", "name", "ownerId", "updatedAt" FROM "ShoppingList";
DROP TABLE "ShoppingList";
ALTER TABLE "new_ShoppingList" RENAME TO "ShoppingList";
CREATE INDEX "ShoppingList_ownerId_idx" ON "ShoppingList"("ownerId");
CREATE TABLE "new_ShoppingListAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantedById" TEXT,
    "grantedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShoppingListAccess_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingListAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ShoppingListAccess_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ShoppingListAccess" ("grantedAt", "grantedById", "id", "listId", "userId") SELECT "grantedAt", "grantedById", "id", "listId", "userId" FROM "ShoppingListAccess";
DROP TABLE "ShoppingListAccess";
ALTER TABLE "new_ShoppingListAccess" RENAME TO "ShoppingListAccess";
CREATE INDEX "ShoppingListAccess_userId_idx" ON "ShoppingListAccess"("userId");
CREATE UNIQUE INDEX "ShoppingListAccess_listId_userId_key" ON "ShoppingListAccess"("listId", "userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "PantryItem_ingredientId_idx" ON "PantryItem"("ingredientId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");
