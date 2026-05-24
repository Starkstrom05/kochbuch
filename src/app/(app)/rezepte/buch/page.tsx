import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { searchRecipes } from "@/lib/recipes/search";
import RecipeBook from "@/components/book/RecipeBookLoader";
import type { BookRecipe } from "@/components/book/RecipeBook";
import { InkFilters } from "@/components/oma/InkFilters";
import { getAppName } from "@/lib/config/app-config";

type SearchParams = Promise<{ q?: string; categoryId?: string }>;

export default async function RezepteBuchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { q, categoryId } = await searchParams;
  const matches = await searchRecipes({ q, categoryId, familyId: session?.user?.familyId });
  if (matches.length === 0) {
    redirect(
      `/rezepte${q || categoryId ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(categoryId ? { categoryId } : {}) }).toString()}` : ""}`,
    );
  }

  const ids = matches.map((r) => r.id);
  const detailed = await prisma.recipe.findMany({
    where: { id: { in: ids } },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      ratings: { select: { stars: true } },
      images: { orderBy: { order: "asc" }, select: { path: true } },
    },
  });
  const byId = new Map(detailed.map((r) => [r.id, r]));

  const recipes: BookRecipe[] = matches
    .map((m) => byId.get(m.id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      servings: r.servings,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      instructions: r.instructions,
      imagePaths: r.images.map((img) => img.path),
      tags: r.tags,
      ingredients: r.ingredients.map((ri) => ({
        amount: ri.amount,
        unit: ri.unit,
        note: ri.note,
        ingredient: { name: ri.ingredient.name },
      })),
      ratings: r.ratings.map((rt) => ({ stars: rt.stars })),
    }));

  const subtitle =
    q && categoryId
      ? `Suche: «${q}» in Kategorie`
      : q
        ? `Suche: «${q}»`
        : categoryId
          ? `Gefilterte Auswahl`
          : `Alle Rezepte`;

  return (
    <main className="fixed inset-0 flex flex-col pt-safe pb-safe px-safe" style={{ background: "linear-gradient(160deg, #2a1d12 0%, #1a120a 100%)" }}>
      <InkFilters />
      <RecipeBook recipes={recipes} title={await getAppName()} subtitle={subtitle} />
    </main>
  );
}
