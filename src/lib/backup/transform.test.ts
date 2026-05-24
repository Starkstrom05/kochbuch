import { describe, it, expect } from "vitest";
import { recipeToBackup, planImport, imageZipPath, type ExportRecipe } from "./transform";
import { backupSchema, type BackupRecipe } from "@/lib/schemas/backup";

function exportRecipe(overrides: Partial<ExportRecipe> = {}): ExportRecipe {
  return {
    title: "Kartoffelsalat",
    slug: "kartoffelsalat",
    description: "Omas Klassiker",
    servings: 4,
    prepMinutes: 20,
    cookMinutes: 30,
    difficulty: 1,
    sourceUrl: null,
    sourceType: "MANUAL",
    instructions: "Kochen\nMischen",
    notes: null,
    tags: "sommer",
    isPublic: false,
    categories: [{ category: { name: "Beilage", icon: "🥔" } }],
    ingredients: [
      { amount: 500, unit: "g", note: null, group: null, order: 0, ingredient: { name: "Kartoffeln" } },
    ],
    steps: [
      { position: 0, text: "Kochen", durationSeconds: 1200 },
      { position: 1, text: "Mischen", durationSeconds: null },
    ],
    images: [{ path: "/recipes/abc/img1.jpg", order: 0, caption: "Teller" }],
    ...overrides,
  };
}

describe("imageZipPath", () => {
  it("prefixes the stored path with images/", () => {
    expect(imageZipPath("/recipes/abc/img1.jpg")).toBe("images/recipes/abc/img1.jpg");
  });
});

describe("recipeToBackup", () => {
  it("maps relations to the flat backup shape", () => {
    const { recipe, files } = recipeToBackup(exportRecipe());
    expect(recipe.title).toBe("Kartoffelsalat");
    expect(recipe.categories).toEqual([{ name: "Beilage", icon: "🥔" }]);
    expect(recipe.ingredients[0]).toMatchObject({ name: "Kartoffeln", amount: 500, unit: "g", order: 0 });
    expect(recipe.steps).toEqual([
      { position: 0, text: "Kochen", durationSeconds: 1200 },
      { position: 1, text: "Mischen", durationSeconds: null },
    ]);
    expect(recipe.images).toEqual([
      { file: "images/recipes/abc/img1.jpg", order: 0, caption: "Teller" },
    ]);
    expect(files).toEqual([{ zipPath: "images/recipes/abc/img1.jpg", relPath: "/recipes/abc/img1.jpg" }]);
  });

  it("handles a recipe without images", () => {
    const { recipe, files } = recipeToBackup(exportRecipe({ images: [] }));
    expect(recipe.images).toEqual([]);
    expect(files).toEqual([]);
  });

  it("produces output that satisfies the backup schema", () => {
    const { recipe } = recipeToBackup(exportRecipe());
    const parsed = backupSchema.safeParse({
      version: 1,
      app: "kochbuch",
      exportedAt: new Date().toISOString(),
      recipes: [recipe],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("planImport", () => {
  const recipes = [
    { title: "Suppe" },
    { title: "Salat" },
  ] as BackupRecipe[];

  it("skips recipes whose title already exists (case-insensitive)", () => {
    const { toImport, skipped } = planImport(recipes, new Set(["suppe"]), "skip");
    expect(skipped).toBe(1);
    expect(toImport.map((r) => r.title)).toEqual(["Salat"]);
  });

  it("imports everything in duplicate mode", () => {
    const { toImport, skipped } = planImport(recipes, new Set(["suppe", "salat"]), "duplicate");
    expect(skipped).toBe(0);
    expect(toImport).toHaveLength(2);
  });
});

describe("backupSchema", () => {
  it("rejects a wrong version", () => {
    const res = backupSchema.safeParse({ version: 2, exportedAt: "x", recipes: [] });
    expect(res.success).toBe(false);
  });

  it("applies defaults for optional recipe fields", () => {
    const res = backupSchema.safeParse({
      version: 1,
      exportedAt: "2026-05-24T00:00:00Z",
      recipes: [{ title: "Nur Titel" }],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      const r = res.data.recipes[0];
      expect(r.servings).toBe(4);
      expect(r.sourceType).toBe("MANUAL");
      expect(r.categories).toEqual([]);
      expect(r.images).toEqual([]);
    }
  });
});
