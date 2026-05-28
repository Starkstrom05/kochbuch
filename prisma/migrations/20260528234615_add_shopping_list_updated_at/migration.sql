-- AlterTable: Versionsstempel für Live-Update-Polling.
-- SQLite erlaubt bei ADD COLUMN nur konstante Defaults — daher fixer Stempel,
-- danach Backfill auf createdAt.
ALTER TABLE "ShoppingList" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
UPDATE "ShoppingList" SET "updatedAt" = "createdAt";
