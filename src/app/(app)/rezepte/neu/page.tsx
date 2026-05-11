import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import { createRecipeAction } from "../actions";

export default async function NeuPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string }>;
}) {
  const { title } = await searchParams;
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

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
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="font-hand text-5xl text-ink ink-text">Neues Rezept</h1>
        <Link href="/rezepte" className="font-written text-sm text-ribbon underline underline-offset-4">
          zurück zur Übersicht
        </Link>
      </header>

      <RecipeEditor action={createRecipeAction} categories={categories} initial={initial} submitLabel="Rezept speichern" />
    </main>
  );
}
