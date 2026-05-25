import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7: Verbindung laeuft ueber den Driver-Adapter (better-sqlite3), nicht
// mehr ueber die Rust-Query-Engine. Die URL kommt direkt aus DATABASE_URL.
function createPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ist nicht gesetzt");
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
