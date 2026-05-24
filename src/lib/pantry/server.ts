import { prisma } from "@/lib/db/prisma";
import type { Ingredient, PantryItem } from "@prisma/client";
import { visibleToFamily } from "@/lib/recipes/visibility";

// ── Pantry-CRUD ──────────────────────────────────────────────────────────────

export async function getPantryForUser(userId: string): Promise<
  (PantryItem & { ingredient: Ingredient })[]
> {
  return prisma.pantryItem.findMany({
    where: { ownerId: userId },
    include: { ingredient: true },
    orderBy: { ingredient: { name: "asc" } },
  });
}

/**
 * Idempotent: legt einen Pantry-Eintrag an, oder ersetzt Menge/Einheit, wenn
 * für (owner, ingredient) schon ein Eintrag existiert. Zutat wird per
 * findOrCreate aus dem normalisierten Ingredient-Bestand gezogen — gleicher
 * Name (case-insensitive, getrimmt) trifft denselben Eintrag.
 */
export async function addPantryItem(
  userId: string,
  rawName: string,
  amount: number | null,
  unit: string | null,
): Promise<PantryItem & { ingredient: Ingredient }> {
  const name = rawName.trim();
  if (!name) throw new Error("Zutatenname fehlt");

  // Ingredient.name ist @unique aber case-sensitive — wir normalisieren auf
  // den ersten Eintrag, der case-insensitive matched, oder legen einen mit
  // dem original-cased Namen an.
  const existing = await prisma.ingredient.findFirst({
    where: { name: { equals: name } },
  });
  const ingredient =
    existing ??
    (await prisma.ingredient.create({
      data: { name },
    }));

  return prisma.pantryItem.upsert({
    where: { ownerId_ingredientId: { ownerId: userId, ingredientId: ingredient.id } },
    create: { ownerId: userId, ingredientId: ingredient.id, amount, unit },
    update: { amount, unit },
    include: { ingredient: true },
  });
}

export async function removePantryItem(userId: string, itemId: string): Promise<void> {
  await prisma.pantryItem.deleteMany({ where: { id: itemId, ownerId: userId } });
}

export async function clearPantry(userId: string): Promise<void> {
  await prisma.pantryItem.deleteMany({ where: { ownerId: userId } });
}

// ── Match ────────────────────────────────────────────────────────────────────

export type RecipeMatch = {
  recipeId: string;
  slug: string;
  title: string;
  servings: number;
  coverPath: string | null;
  matched: { id: string; name: string }[];
  missing: { id: string; name: string; amount: number | null; unit: string | null }[];
  total: number;
  /** matched / total — anteilige Abdeckung des Rezepts durch den Vorrat. */
  ratio: number;
};

/**
 * Match-Strategie: ID-Identität ODER case-insensitive Substring-Match in
 * beide Richtungen (Pantry-Name in Rezeptzutaten-Namen oder umgekehrt).
 * Damit triff "Ketchup" auch "Tomatenketchup" und "Bauchspeck" deckt
 * "Speck" mit ab. Min-Länge 3 verhindert dass "Ei" → "Eis" matched.
 */
export type PantryMatcher = {
  ids: Set<string>;
  names: string[];
};

const FUZZY_MIN_LEN = 3;

export function buildMatcher(
  pantry: { ingredientId: string; ingredient: { name: string } }[],
): PantryMatcher {
  return {
    ids: new Set(pantry.map((p) => p.ingredientId)),
    names: pantry.map((p) => p.ingredient.name.toLowerCase().trim()),
  };
}

export function matchesPantry(
  m: PantryMatcher,
  ri: { ingredientId: string; ingredient: { name: string } },
): boolean {
  if (m.ids.has(ri.ingredientId)) return true;
  const target = ri.ingredient.name.toLowerCase().trim();
  for (const p of m.names) {
    if (p === target) return true;
    if (p.length >= FUZZY_MIN_LEN && target.includes(p)) return true;
    if (target.length >= FUZZY_MIN_LEN && p.includes(target)) return true;
  }
  return false;
}

/**
 * Match aller aktiven Rezepte gegen die Pantry des Nutzers. Sortiert
 * primär nach absolutem Treffer (matched DESC), sekundär nach Lücke
 * (missing ASC). Liefert nur Rezepte mit mindestens einem Treffer.
 *
 * Performance: Statt ALLE Recipes mit allen Ingredients zu laden, finden
 * wir erst per DB-Query die Ingredient-IDs, die per Substring zu einem
 * Pantry-Eintrag matchen — und holen dann nur Rezepte, die mindestens
 * einen dieser Ingredients nutzen. Das reduziert das Datenvolumen bei
 * vielen Rezepten drastisch (≥1 Treffer ist ja Voraussetzung).
 */
export async function matchRecipesForUser(
  userId: string,
  familyId: string | null | undefined,
  limit = 20,
): Promise<RecipeMatch[]> {
  const pantry = await getPantryForUser(userId);
  if (pantry.length === 0) return [];
  const matcher = buildMatcher(pantry);

  const candidateIds = await collectCandidateIngredientIds(matcher);
  if (candidateIds.size === 0) return [];

  const recipes = await prisma.recipe.findMany({
    where: {
      isActive: true,
      ingredients: { some: { ingredientId: { in: Array.from(candidateIds) } } },
      ...visibleToFamily(familyId),
    },
    include: {
      ingredients: { include: { ingredient: true } },
      images: { orderBy: { order: "asc" }, take: 1, select: { path: true } },
    },
  });

  return rankMatches(matcher, recipes).slice(0, limit);
}

/**
 * Sammelt aus der Ingredient-Tabelle die IDs aller Einträge, die per ID
 * direkt oder per Substring-Match (≥3 Zeichen, in beide Richtungen) zum
 * Pantry-Matcher passen — entspricht der Logik in matchesPantry. Wird
 * als Vorfilter für die Recipe-Query genutzt.
 */
async function collectCandidateIngredientIds(
  matcher: PantryMatcher,
): Promise<Set<string>> {
  const out = new Set<string>(matcher.ids);

  // Fuzzy-Kandidaten: SQL-LIKE mit den Pantry-Namen (≥3 Zeichen).
  // Pantry-Name als Substring im Ingredient-Name (a-includes-b).
  const aLikePatterns = matcher.names
    .filter((n) => n.length >= FUZZY_MIN_LEN)
    .map((n) => `%${n}%`);

  if (aLikePatterns.length > 0) {
    const hits = await prisma.ingredient.findMany({
      where: { OR: aLikePatterns.map((p) => ({ name: { contains: p.slice(1, -1) } })) },
      select: { id: true, name: true },
    });
    for (const h of hits) out.add(h.id);
  }

  // Umgekehrte Richtung: Ingredient-Name als Substring eines Pantry-Namens
  // — die DB hat dafür keinen Index. Wir holen alle Ingredients, deren Name
  // ≥3 Zeichen ist, und prüfen in-process. Bei riesigen Ingredient-Tabellen
  // wäre das auch teuer, aber Ingredients sind normalisiert und die Menge
  // bleibt überschaubar.
  const allIngredients = await prisma.ingredient.findMany({
    select: { id: true, name: true },
  });
  for (const ing of allIngredients) {
    const lower = ing.name.toLowerCase().trim();
    if (lower.length < FUZZY_MIN_LEN) continue;
    if (matcher.names.some((p) => p.includes(lower))) {
      out.add(ing.id);
    }
  }
  return out;
}

type RawRecipe = {
  id: string;
  slug: string;
  title: string;
  servings: number;
  images: { path: string }[];
  ingredients: {
    ingredientId: string;
    amount: number | null;
    unit: string | null;
    ingredient: { name: string };
  }[];
};

export function rankMatches(
  matcher: PantryMatcher,
  recipes: RawRecipe[],
): RecipeMatch[] {
  const out: RecipeMatch[] = [];
  for (const r of recipes) {
    if (r.ingredients.length === 0) continue;
    const matched: RecipeMatch["matched"] = [];
    const missing: RecipeMatch["missing"] = [];
    for (const ri of r.ingredients) {
      if (matchesPantry(matcher, ri)) {
        matched.push({ id: ri.ingredientId, name: ri.ingredient.name });
      } else {
        missing.push({
          id: ri.ingredientId,
          name: ri.ingredient.name,
          amount: ri.amount,
          unit: ri.unit,
        });
      }
    }
    if (matched.length === 0) continue;
    out.push({
      recipeId: r.id,
      slug: r.slug,
      title: r.title,
      servings: r.servings,
      coverPath: r.images[0]?.path ?? null,
      matched,
      missing,
      total: r.ingredients.length,
      ratio: matched.length / r.ingredients.length,
    });
  }
  out.sort((a, b) => {
    if (b.matched.length !== a.matched.length) {
      return b.matched.length - a.matched.length;
    }
    return a.missing.length - b.missing.length;
  });
  return out;
}
