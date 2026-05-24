import { prisma } from "@/lib/db/prisma";
import { createRecipe } from "@/lib/recipes/server";
import { addImageFromBuffer } from "@/lib/recipes/images";
import { recipeInputSchema } from "@/lib/schemas/recipe";
import type { BackupData } from "@/lib/schemas/backup";
import { planImport, type ImportMode } from "./transform";

export type ImportSummary = {
  imported: number;
  skipped: number;
  images: number;
  errors: string[];
};

/**
 * Spielt ein Backup ein. Bilddaten werden über `readImage(zipPath)` geholt
 * (Route reicht einen ZIP-Reader rein). Nutzt createRecipe (inkl. Schritte) +
 * addImageFromBuffer, daher keine Pfad-Rewrites / Orphans.
 */
export async function applyBackup(
  data: BackupData,
  readImage: (zipPath: string) => Promise<Buffer | null>,
  opts: { mode: ImportMode; userId: string },
): Promise<ImportSummary> {
  // 1) Kategorien per Name upserten → name(lower) → id
  const catMap = new Map<string, string>();
  for (const r of data.recipes) {
    for (const c of r.categories) {
      const name = c.name.trim();
      const key = name.toLowerCase();
      if (!name || catMap.has(key)) continue;
      const cat = await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, icon: c.icon ?? null },
      });
      catMap.set(key, cat.id);
    }
  }

  // 2) Vorhandene Titel für den Skip-Modus
  const existing = await prisma.recipe.findMany({ select: { title: true } });
  const existingTitles = new Set(existing.map((e) => e.title.trim().toLowerCase()));

  const { toImport, skipped } = planImport(data.recipes, existingTitles, opts.mode);
  const summary: ImportSummary = { imported: 0, skipped, images: 0, errors: [] };

  for (const r of toImport) {
    try {
      const parsed = recipeInputSchema.safeParse({
        title: r.title,
        description: r.description ?? null,
        servings: r.servings,
        prepMinutes: r.prepMinutes ?? null,
        cookMinutes: r.cookMinutes ?? null,
        difficulty: r.difficulty ?? null,
        instructions:
          r.instructions && r.instructions.trim()
            ? r.instructions
            : r.steps.map((s) => s.text).join("\n"),
        notes: r.notes ?? null,
        sourceUrl: r.sourceUrl ?? null,
        sourceType: r.sourceType,
        tags: r.tags ?? null,
        categoryIds: r.categories
          .map((c) => catMap.get(c.name.trim().toLowerCase()))
          .filter((x): x is string => Boolean(x)),
        ingredients: r.ingredients.map((i) => ({
          name: i.name,
          amount: i.amount ?? null,
          unit: i.unit ?? null,
          note: i.note ?? null,
          group: i.group ?? null,
        })),
        steps: r.steps.length
          ? r.steps.map((s) => ({ text: s.text, durationSeconds: s.durationSeconds ?? null }))
          : undefined,
      });

      if (!parsed.success) {
        summary.errors.push(
          `Rezept "${r.title}": ungültig (${parsed.error.issues[0]?.message ?? "Validierung"})`,
        );
        continue;
      }

      const recipe = await createRecipe(parsed.data, opts.userId);
      if (!recipe) throw new Error("Anlegen fehlgeschlagen");
      summary.imported++;

      for (const img of [...r.images].sort((a, b) => a.order - b.order)) {
        const buf = await readImage(img.file);
        if (!buf) continue;
        try {
          await addImageFromBuffer(recipe.id, buf, {
            order: img.order,
            caption: img.caption ?? undefined,
          });
          summary.images++;
        } catch (e) {
          summary.errors.push(`Bild ${img.file}: ${e instanceof Error ? e.message : "Fehler"}`);
        }
      }
    } catch (e) {
      summary.errors.push(`Rezept "${r.title}": ${e instanceof Error ? e.message : "Fehler"}`);
    }
  }

  return summary;
}
