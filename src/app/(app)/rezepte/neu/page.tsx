import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import { categoryVisibleToCookbook } from "@/lib/recipes/visibility";
import { createRecipeAction } from "../actions";

export default async function NeuPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const { title } = await searchParams;
  const session = await auth();
  const categories = await prisma.category.findMany({
    where: categoryVisibleToCookbook(session?.user?.activeCookbookId),
    orderBy: { name: "asc" },
  });

  const initial = title
    ? {
        title: decodeURIComponent(title),
        description: "",
        servings: 4,
        prepMinutes: null,
        cookMinutes: null,
        difficulty: null,
        instructions: "",
        notes: "",
        sourceUrl: "",
        tags: "",
        categoryIds: [],
        ingredients: [],
      }
    : undefined;

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-4xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-hand text-ink ink-text text-5xl">Neues Rezept</h1>
        <Link
          href="/rezepte"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          zurück zur Übersicht
        </Link>
      </header>

      <RecipeEditor
        action={createRecipeAction}
        categories={categories}
        initial={initial}
        submitLabel="Rezept speichern"
      />
    </main>
  );
}
