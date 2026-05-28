-- CreateTable
CREATE TABLE "FrequentItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT,
    "count" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrequentItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FrequentItem_ownerId_idx" ON "FrequentItem"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "FrequentItem_ownerId_name_key" ON "FrequentItem"("ownerId", "name");
