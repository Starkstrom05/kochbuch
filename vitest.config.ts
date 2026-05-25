import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Manche Module ziehen den Prisma-Singleton ueber den Import-Graph rein
    // (z.B. lib/pantry/server). Der Driver-Adapter (Prisma 7) verlangt eine
    // DATABASE_URL schon beim Erzeugen — hier eine harmlose In-Memory-DB, die
    // Unit-Tests nutzen sie nicht fuer echte Queries.
    env: { DATABASE_URL: "file::memory:?cache=shared" },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
