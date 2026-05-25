import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: Connection-URL fuer die CLI (migrate/studio) liegt hier, nicht mehr
// in schema.prisma. Die App selbst verbindet sich ueber den Driver-Adapter
// (src/lib/db/prisma.ts), der die URL direkt aus DATABASE_URL liest.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
