import type { PrismaClient } from "@prisma/client";
import { NUTRITION_DATA } from "./data";

/**
 * Upsert die lokale Nährwert-Tabelle: legt fehlende Zutaten an, ergänzt Dichte
 * und Nährwerte. Idempotent — kann gefahrlos erneut laufen (Seed + Admin-Reload).
 * Nimmt den Prisma-Client als Argument, damit prisma/seed.ts seinen eigenen
 * Client nutzen kann und kein Singleton-Import nötig ist.
 */
export async function seedNutrition(prisma: PrismaClient): Promise<{ count: number }> {
  let count = 0;
  for (const e of NUTRITION_DATA) {
    const ing = await prisma.ingredient.upsert({
      where: { name: e.name },
      update: {
        ...(e.aliases !== undefined ? { aliases: e.aliases } : {}),
        ...(e.category !== undefined ? { category: e.category } : {}),
        ...(e.density !== undefined ? { density: e.density } : {}),
      },
      create: {
        name: e.name,
        aliases: e.aliases ?? null,
        category: e.category ?? null,
        density: e.density ?? null,
      },
    });

    await prisma.ingredientNutrition.upsert({
      where: { ingredientId: ing.id },
      update: {
        kcal: e.kcal,
        proteinG: e.proteinG ?? null,
        carbsG: e.carbsG ?? null,
        fatG: e.fatG ?? null,
        fiberG: e.fiberG ?? null,
      },
      create: {
        ingredientId: ing.id,
        kcal: e.kcal,
        proteinG: e.proteinG ?? null,
        carbsG: e.carbsG ?? null,
        fatG: e.fatG ?? null,
        fiberG: e.fiberG ?? null,
      },
    });
    count++;
  }
  return { count };
}
