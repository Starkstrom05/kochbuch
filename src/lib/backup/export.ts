import { prisma } from "@/lib/db/prisma";
import { resolveUploadPath } from "@/lib/images/upload";
import type { BackupData } from "@/lib/schemas/backup";
import { recipeToBackup, type BackupFile } from "./transform";

/** Sammelt alle aktiven Rezepte als Backup-Daten + Liste der Bilddateien fürs ZIP. */
export async function collectBackup(): Promise<{ data: BackupData; files: BackupFile[] }> {
  const recipes = await prisma.recipe.findMany({
    where: { isActive: true },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      categories: { include: { category: true } },
      steps: { orderBy: { position: "asc" } },
      images: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const files: BackupFile[] = [];
  const backupRecipes = recipes.map((r) => {
    const { recipe, files: rf } = recipeToBackup(r);
    files.push(...rf);
    return recipe;
  });

  return {
    data: {
      version: 1,
      app: "kochbuch",
      exportedAt: new Date().toISOString(),
      recipes: backupRecipes,
    },
    files,
  };
}

/** Absoluter Dateipfad zu einem Bild im UPLOAD_DIR (für das ZIP-Lesen). */
export function resolveBackupFile(relPath: string): string {
  return resolveUploadPath(relPath);
}
