import type { BackupRecipe } from "@/lib/schemas/backup";

// Reine Transformationen — bewusst ohne prisma/sharp-Importe, damit sie leicht
// testbar sind und nicht die ganze DB-/Bild-Schicht mitladen.

export type ExportRecipe = {
  title: string;
  slug: string;
  description: string | null;
  servings: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
  difficulty: number | null;
  sourceUrl: string | null;
  sourceType: string;
  instructions: string;
  notes: string | null;
  tags: string | null;
  isPublic: boolean;
  categories: { category: { name: string; icon: string | null } }[];
  ingredients: {
    amount: number | null;
    unit: string | null;
    note: string | null;
    group: string | null;
    order: number;
    ingredient: { name: string };
  }[];
  steps: { position: number; text: string; durationSeconds: number | null }[];
  images: { path: string; order: number; caption: string | null }[];
};

/** Pfad eines Bildes im ZIP, abgeleitet aus dem gespeicherten RecipeImage.path. */
export function imageZipPath(recipeImagePath: string): string {
  return `images${recipeImagePath}`;
}

export type BackupFile = { zipPath: string; relPath: string };

/** Pure: Rezept (mit Relationen) → Backup-Form + Liste der Bilddateien. */
export function recipeToBackup(r: ExportRecipe): { recipe: BackupRecipe; files: BackupFile[] } {
  const files: BackupFile[] = [];
  const images = r.images.map((img) => {
    const zipPath = imageZipPath(img.path);
    files.push({ zipPath, relPath: img.path });
    return { file: zipPath, order: img.order, caption: img.caption };
  });

  const recipe: BackupRecipe = {
    title: r.title,
    slug: r.slug,
    description: r.description,
    servings: r.servings,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    difficulty: r.difficulty,
    sourceUrl: r.sourceUrl,
    sourceType: r.sourceType,
    instructions: r.instructions,
    notes: r.notes,
    tags: r.tags,
    isPublic: r.isPublic,
    categories: r.categories.map((c) => ({ name: c.category.name, icon: c.category.icon })),
    ingredients: r.ingredients.map((i) => ({
      name: i.ingredient.name,
      amount: i.amount,
      unit: i.unit,
      note: i.note,
      group: i.group,
      order: i.order,
    })),
    steps: r.steps.map((s) => ({
      position: s.position,
      text: s.text,
      durationSeconds: s.durationSeconds,
    })),
    images,
  };

  return { recipe, files };
}

export type ImportMode = "skip" | "duplicate";

/**
 * Pure: entscheidet, welche Backup-Rezepte importiert werden.
 * `existingTitles` muss lowercased + getrimmt sein.
 */
export function planImport(
  recipes: BackupRecipe[],
  existingTitles: Set<string>,
  mode: ImportMode,
): { toImport: BackupRecipe[]; skipped: number } {
  if (mode === "duplicate") return { toImport: [...recipes], skipped: 0 };

  const toImport: BackupRecipe[] = [];
  let skipped = 0;
  for (const r of recipes) {
    if (existingTitles.has(r.title.trim().toLowerCase())) skipped++;
    else toImport.push(r);
  }
  return { toImport, skipped };
}
