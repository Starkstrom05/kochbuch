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

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
