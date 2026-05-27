import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { searchRecipesFull } from "@/lib/recipes/search";
import RecipeBook from "@/components/book/RecipeBookLoader";
import type { BookRecipe } from "@/components/book/RecipeBook";
import { InkFilters } from "@/components/oma/InkFilters";
import { getAppName } from "@/lib/config/app-config";

type SearchParams = Promise<{ q?: string; categoryId?: string }>;

export default async function RezepteBuchPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth();
  const { q, categoryId } = await searchParams;
  if (!session?.user?.activeCookbookId) redirect("/rezepte");
  const activeCookbook = await prisma.cookbook.findUnique({
    where: { id: session.user.activeCookbookId },
    select: { name: true },
  });
  const detailed = await searchRecipesFull({
    q,
    categoryId,
    cookbookId: session.user.activeCookbookId,
  });
  if (detailed.length === 0) {
    redirect(
      `/rezepte${q || categoryId ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(categoryId ? { categoryId } : {}) }).toString()}` : ""}`,
    );
  }

  const recipes: BookRecipe[] = detailed.map((r) => ({
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
    <main
      className="pt-safe pb-safe px-safe fixed inset-0 flex flex-col"
      style={{ background: "linear-gradient(160deg, #2a1d12 0%, #1a120a 100%)" }}
    >
      <InkFilters />
      <RecipeBook
        recipes={recipes}
        title={activeCookbook?.name ?? (await getAppName())}
        subtitle={subtitle}
      />
    </main>
  );
}
