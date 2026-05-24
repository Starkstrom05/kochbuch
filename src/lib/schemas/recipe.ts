import { z } from "zod";
import { SOURCE_TYPES } from "@/lib/db/enums";

export const ingredientLineSchema = z.object({
  name: z.string().min(1, "Zutat fehlt").max(120),
  amount: z
    .union([z.number().positive(), z.literal(null)])
    .nullable()
    .optional(),
  unit: z.string().max(20).nullable().optional(),
  note: z.string().max(120).nullable().optional(),
  group: z.string().max(60).nullable().optional(),
});

export const recipeStepSchema = z.object({
  text: z.string().min(1, "Schritt-Text fehlt").max(2000),
  durationSeconds: z.number().int().min(1).max(86400).nullable().optional(),
});

export const recipeInputSchema = z.object({
  title: z.string().min(1, "Titel fehlt").max(200),
  description: z.string().max(2000).nullable().optional(),
  servings: z.number().int().min(1).max(99).default(4),
  prepMinutes: z.number().int().min(0).max(9999).nullable().optional(),
  cookMinutes: z.number().int().min(0).max(9999).nullable().optional(),
  difficulty: z.number().int().min(1).max(3).nullable().optional(),
  instructions: z.string().min(1, "Anleitung fehlt").max(20000),
  notes: z.string().max(4000).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional().or(z.literal("")),
  sourceType: z.enum(SOURCE_TYPES).default("MANUAL"),
  tags: z.string().max(400).nullable().optional(),
  categoryIds: z.array(z.string()).default([]),
  ingredients: z.array(ingredientLineSchema).max(120).default([]),
  steps: z.array(recipeStepSchema).max(100).optional(),
  visibility: z.enum(["SHARED", "FAMILY"]).default("SHARED"),
  // Nährwert-Override pro Portion (optional; überschreibt die Auto-Schätzung)
  nutritionKcal: z.number().min(0).max(100000).nullable().optional(),
  nutritionProteinG: z.number().min(0).max(10000).nullable().optional(),
  nutritionCarbsG: z.number().min(0).max(10000).nullable().optional(),
  nutritionFatG: z.number().min(0).max(10000).nullable().optional(),
});

export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type IngredientLine = z.infer<typeof ingredientLineSchema>;
export type RecipeStepInput = z.infer<typeof recipeStepSchema>;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
