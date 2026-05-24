import { z } from "zod";

/** Versioniertes Backup-Format. `images[].file` referenziert einen Eintrag im ZIP. */

export const backupImageSchema = z.object({
  file: z.string().min(1),
  order: z.number().int().min(0).default(0),
  caption: z.string().nullable().optional(),
});

export const backupCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
});

export const backupIngredientSchema = z.object({
  name: z.string().min(1),
  amount: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  group: z.string().nullable().optional(),
  order: z.number().int().min(0).default(0),
});

export const backupStepSchema = z.object({
  position: z.number().int().min(0),
  text: z.string().min(1),
  durationSeconds: z.number().int().nullable().optional(),
});

export const backupRecipeSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  servings: z.number().int().min(1).max(99).default(4),
  prepMinutes: z.number().int().min(0).nullable().optional(),
  cookMinutes: z.number().int().min(0).nullable().optional(),
  difficulty: z.number().int().min(1).max(3).nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceType: z.string().default("MANUAL"),
  instructions: z.string().default(""),
  notes: z.string().nullable().optional(),
  tags: z.string().nullable().optional(),
  isPublic: z.boolean().default(false),
  categories: z.array(backupCategorySchema).default([]),
  ingredients: z.array(backupIngredientSchema).default([]),
  steps: z.array(backupStepSchema).default([]),
  images: z.array(backupImageSchema).default([]),
});

export const backupSchema = z.object({
  version: z.literal(1),
  app: z.literal("kochbuch").optional(),
  exportedAt: z.string(),
  recipes: z.array(backupRecipeSchema),
});

export type BackupData = z.infer<typeof backupSchema>;
export type BackupRecipe = z.infer<typeof backupRecipeSchema>;
export type BackupImage = z.infer<typeof backupImageSchema>;
