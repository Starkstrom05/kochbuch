import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7: Verbindung laeuft ueber den Driver-Adapter (better-sqlite3), nicht
// mehr ueber die Rust-Query-Engine. Die URL kommt direkt aus DATABASE_URL.
function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt");
  const adapter = new PrismaBetterSqlite3({ url });
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  // WAL erlaubt parallele Reads waehrend einzelne Writes laufen — entscheidend,
  // weil Puppeteer-PDF-Renderer waehrend des Drucks selbst lesende Queries
  // absetzt und sich sonst mit gleichzeitigen Saves um den DB-Lock prügelt
  // (SQLITE_BUSY). busy_timeout gibt Wartenden ein paar Sekunden statt sofort
  // zu scheitern; synchronous=NORMAL ist mit WAL crash-safe und ~10x schneller
  // als FULL. PRAGMAs gelten pro Connection — better-sqlite3 hat eine, daher
  // ist das ein einmaliger Setup-Call.
  client
    .$executeRawUnsafe("PRAGMA journal_mode = WAL")
    .catch((e) => console.warn("PRAGMA journal_mode=WAL failed:", e));
  client
    .$executeRawUnsafe("PRAGMA busy_timeout = 5000")
    .catch((e) => console.warn("PRAGMA busy_timeout failed:", e));
  client
    .$executeRawUnsafe("PRAGMA synchronous = NORMAL")
    .catch((e) => console.warn("PRAGMA synchronous=NORMAL failed:", e));

  healFts5(client).catch((e) => console.warn("FTS5-Selbstheilung fehlgeschlagen:", e));

  return client;
}

interface SqliteMasterRow {
  name: string;
}

interface CountRow {
  c: number;
}

// recipe_fts (external-content FTS5, siehe Migration
// 20260527203100_add_recipe_fts5) haengt an der Recipe-Tabelle, ist aber
// selbst kein Prisma-Model — ein kuenftiger Table-Rebuild, ein VACUUM/Restore
// oder ein manueller Eingriff kann Tabelle/Trigger still verlieren oder das
// rowid-Mapping korrumpieren, ohne dass ein Fehler auftritt (die Suche liefert
// dann nur stumm falsche/keine Treffer). Diese Funktion laeuft einmalig beim
// Client-Setup, ist idempotent und legt Fehlendes identisch zur Original-
// Migration neu an; bei jeder Neuanlage oder einem Count-Mismatch wird der
// FTS5-Index per 'rebuild'-Kommando neu aus der Recipe-Tabelle aufgebaut.
async function healFts5(client: PrismaClient): Promise<void> {
  const tableRows = await client.$queryRawUnsafe<SqliteMasterRow[]>(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'recipe_fts'`,
  );
  const triggerRows = await client.$queryRawUnsafe<SqliteMasterRow[]>(
    `SELECT name FROM sqlite_master WHERE type = 'trigger' AND name IN ('recipe_fts_ai', 'recipe_fts_ad', 'recipe_fts_au')`,
  );
  const foundTriggers = new Set(triggerRows.map((r) => r.name));
  const hasTable = tableRows.length > 0;
  const hasAllTriggers =
    foundTriggers.has("recipe_fts_ai") &&
    foundTriggers.has("recipe_fts_ad") &&
    foundTriggers.has("recipe_fts_au");

  let rebuilt = false;

  if (!hasTable) {
    await client.$executeRawUnsafe(`
      CREATE VIRTUAL TABLE "recipe_fts" USING fts5(
        title,
        description,
        instructions,
        tags,
        content = "Recipe",
        content_rowid = "rowid",
        tokenize = "unicode61 remove_diacritics 2"
      )
    `);
    rebuilt = true;
  }

  if (!hasAllTriggers) {
    // Trigger einzeln idempotent (IF NOT EXISTS) statt bedingt auf hasTable —
    // ein Trigger kann auch dann fehlen, wenn die Tabelle selbst noch da ist.
    await client.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS "recipe_fts_ai" AFTER INSERT ON "Recipe" BEGIN
        INSERT INTO "recipe_fts" (rowid, title, description, instructions, tags)
        VALUES (new.rowid, new.title, COALESCE(new.description, ''), new.instructions, COALESCE(new.tags, ''));
      END
    `);
    await client.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS "recipe_fts_ad" AFTER DELETE ON "Recipe" BEGIN
        INSERT INTO "recipe_fts" (recipe_fts, rowid, title, description, instructions, tags)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), old.instructions, COALESCE(old.tags, ''));
      END
    `);
    await client.$executeRawUnsafe(`
      CREATE TRIGGER IF NOT EXISTS "recipe_fts_au" AFTER UPDATE ON "Recipe" BEGIN
        INSERT INTO "recipe_fts" (recipe_fts, rowid, title, description, instructions, tags)
        VALUES ('delete', old.rowid, old.title, COALESCE(old.description, ''), old.instructions, COALESCE(old.tags, ''));
        INSERT INTO "recipe_fts" (rowid, title, description, instructions, tags)
        VALUES (new.rowid, new.title, COALESCE(new.description, ''), new.instructions, COALESCE(new.tags, ''));
      END
    `);
    rebuilt = true;
  }

  const [recipeCount, ftsCount] = await Promise.all([
    client.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) as c FROM "Recipe"`),
    client.$queryRawUnsafe<CountRow[]>(`SELECT COUNT(*) as c FROM "recipe_fts"`),
  ]);
  const countMismatch = (recipeCount[0]?.c ?? 0) !== (ftsCount[0]?.c ?? 0);

  if (rebuilt || countMismatch) {
    await client.$executeRawUnsafe(`INSERT INTO "recipe_fts"(recipe_fts) VALUES('rebuild')`);
    console.warn(
      `FTS5-Selbstheilung: recipe_fts ${rebuilt ? "neu angelegt/repariert" : "Count-Mismatch"} — Index neu aufgebaut.`,
    );
  }
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
