-- Family-Legacy entfernen: das `Family`-Modell + `User.familyId` stammen aus der
-- Vor-v0.22-Zeit und werden seit der Cookbook-Migration nicht mehr gelesen
-- (Speiseplan-Sharing laeuft ueber `MealPlan.familyShared` + Cookbook-Peers,
-- Branding ueber das aktive Cookbook). NextAuth-Tabellen bleiben unangetastet.
--
-- WICHTIG: Der von `prisma migrate diff` erzeugte Rohdiff wollte zusaetzlich die
-- FTS5-Shadow-Tabellen (recipe_fts*) droppen, weil sie kein Prisma-Modell sind.
-- Diese DROP-Statements sind hier bewusst ENTFERNT — die Volltextsuche bleibt
-- erhalten. Der User-Rebuild unten beruehrt die Recipe-Tabelle nicht, daher
-- bleiben auch die FTS-Trigger (recipe_fts_ai/ad/au) bestehen.

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Family";
PRAGMA foreign_keys=on;

-- RedefineTables (User ohne familyId)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "activeCookbookId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_activeCookbookId_fkey" FOREIGN KEY ("activeCookbookId") REFERENCES "Cookbook" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("activeCookbookId", "createdAt", "email", "id", "name", "passwordHash", "role") SELECT "activeCookbookId", "createdAt", "email", "id", "name", "passwordHash", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_activeCookbookId_idx" ON "User"("activeCookbookId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
