import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { visibleInCookbook } from "@/lib/cookbooks/visibility";

export type RecipeSearch = {
  q?: string;
  categoryId?: string;
  /** Minimaler Durchschnitt der Sternebewertung (1-5). 0 oder undefined = kein Filter. */
  minStars?: number;
  take?: number;
  /** Aktives Cookbook des Betrachters. Liste enthaelt nur Rezepte dieses Buchs. */
  cookbookId: string;
};

/**
 * Token-Liste in einen FTS5-MATCH-String konvertieren:
 *  - Sonderzeichen, die FTS-Syntax sind (", *, NEAR, OR …), werden in
 *    Anführungszeichen verpackt (Phrase-Match).
 *  - Jedes Token bekommt einen Prefix-`*` für „beginnt mit"-Match — sonst
 *    findet die Suche "tom" das Rezept "Tomatensuppe" nicht.
 *  - Mehrere Tokens werden mit `AND` (impliziter Default) verknuepft.
 *
 * Exportiert fuer Unit-Tests.
 */
export function buildFtsQuery(rawTerm: string): string {
  return rawTerm
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => {
      // Innere Quotes verdoppeln (FTS5-Escape), dann gesamtes Token quoten +
      // Prefix-Stern. "1/2" bleibt zusammen, "kann's" wird sauber gehandhabt.
      const escaped = t.replace(/"/g, '""');
      return `"${escaped}"*`;
    })
    .join(" ");
}

/**
 * Baut die WHERE-Klausel + optional die `id IN (...)`-Einschnitt-Liste fuer
 * den Stern-Filter. Geteilte Logik zwischen `searchRecipes` und
 * `searchRecipesFull`.
 *
 * Liefert null, wenn ein Stern-Filter aktiv ist und niemand die Schwelle
 * trifft — Caller darf dann ohne weitere Query direkt `[]` zurueckgeben.
 */
async function buildSearchWhere(search: RecipeSearch): Promise<Prisma.RecipeWhereInput | null> {
  const { q, categoryId, minStars, cookbookId } = search;
  const and: Prisma.RecipeWhereInput[] = [visibleInCookbook(cookbookId)];

  if (q && q.trim()) {
    const term = q.trim();
    // FTS5-Volltext-Match fuer title/description/instructions/tags.
    // Ingredient-Namen muessen separat per Prisma-Relational gefiltert werden,
    // weil die FTS-Tabelle nur die Recipe-Spalten spiegelt (siehe Migration).
    const ftsQuery = buildFtsQuery(term);
    const ftsHits = ftsQuery
      ? await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          SELECT r.id FROM "Recipe" r
          JOIN "recipe_fts" fts ON r.rowid = fts.rowid
          WHERE "recipe_fts" MATCH ${ftsQuery}
        `)
      : [];
    and.push({
      OR: [
        { id: { in: ftsHits.map((h) => h.id) } },
        { ingredients: { some: { ingredient: { name: { contains: term } } } } },
      ],
    });
  }

  const where: Prisma.RecipeWhereInput = { isActive: true, AND: and };

  if (categoryId) {
    where.categories = { some: { categoryId } };
  }

  // Stern-Filter über GROUP BY + HAVING auf der Rating-Tabelle: liefert
  // recipeId für alle Rezepte mit AVG(stars) >= minStars. Ohne Treffer →
  // leere Liste, sonst per id-IN-Filter in die Hauptquery einschneiden.
  if (minStars && minStars > 0) {
    const rated = await prisma.$queryRaw<{ recipeId: string }[]>(Prisma.sql`
      SELECT "recipeId" FROM "Rating"
      GROUP BY "recipeId"
      HAVING AVG(CAST("stars" AS REAL)) >= ${minStars}
    `);
    if (rated.length === 0) return null;
    where.id = { in: rated.map((r) => r.recipeId) };
  }

  return where;
}

export async function searchRecipes(search: RecipeSearch) {
  const where = await buildSearchWhere(search);
  if (!where) return [];

  const recipes = await prisma.recipe.findMany({
    where,
    take: search.take ?? 200,
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      ratings: { select: { stars: true } },
      images: {
        orderBy: { order: "asc" },
        take: 1,
        select: { path: true },
      },
    },
  });

  return recipes;
}

/**
 * Erweiterte Such-Variante fuer die Buch-Ansicht: laedt zusaetzlich alle
 * Bilder (nicht nur das erste) und Ingredients inkl. Ingredient-Namen.
 * Ersetzt das frueher noetige Doppel-Query (`searchRecipes` + zweite
 * `findMany({ id: { in: ids } })`) durch einen einzigen Roundtrip.
 */
export async function searchRecipesFull(search: RecipeSearch) {
  const where = await buildSearchWhere(search);
  if (!where) return [];

  return prisma.recipe.findMany({
    where,
    take: search.take ?? 200,
    orderBy: { updatedAt: "desc" },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      ratings: { select: { stars: true } },
      images: { orderBy: { order: "asc" }, select: { path: true } },
    },
  });
}
