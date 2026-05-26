-- CreateTable
CREATE TABLE "UserOurGroceriesCredentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "encryptedSecret" BLOB NOT NULL,
    "iv" BLOB NOT NULL,
    "authTag" BLOB NOT NULL,
    "defaultListId" TEXT,
    "defaultListName" TEXT,
    "lastSyncAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserOurGroceriesCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserOurGroceriesCredentials_userId_key" ON "UserOurGroceriesCredentials"("userId");
