import type { PrismaClient } from "@prisma/client";
import { NUTRITION_DATA } from "./data";

/**
 * Legt fehlende Zutaten + deren Nährwerte an. Create-only (kein Update-Zweig):
 * Bestandsdaten (User-Korrekturen an Dichte/Aliasen/Kategorie/Nährwerten)
 * duerfen bei einem erneuten Lauf (Seed + Container-Restart) nicht
 * ueberschrieben werden. Nimmt den Prisma-Client als Argument, damit
 * prisma/seed.ts seinen eigenen Client nutzen kann und kein Singleton-Import
 * nötig ist.
 */
export async function seedNutrition(prisma: PrismaClient): Promise<{ count: number }> {
  let count = 0;
  for (const e of NUTRITION_DATA) {
    let ing = await prisma.ingredient.findUnique({ where: { name: e.name } });
    if (!ing) {
      ing = await prisma.ingredient.create({
        data: {
          name: e.name,
          aliases: e.aliases ?? null,
          category: e.category ?? null,
          density: e.density ?? null,
        },
      });
    }

    const existingNutrition = await prisma.ingredientNutrition.findUnique({
      where: { ingredientId: ing.id },
    });
    if (!existingNutrition) {
      await prisma.ingredientNutrition.create({
        data: {
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
  }
  return { count };
}
