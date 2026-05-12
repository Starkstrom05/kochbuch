import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getRecipeBySlug } from "@/lib/recipes/server";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import { updateRecipeAction } from "../../actions";

export default async function BearbeitenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const session = await auth();
  if (!session?.user || session.user.id !== recipe.createdById) {
    redirect(`/rezepte/${slug}`);
  }

  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });

  const initial = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description ?? "",
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    instructions: recipe.instructions,
    notes: recipe.notes ?? "",
    sourceUrl: recipe.sourceUrl ?? "",
    tags: recipe.tags ?? "",
    categoryIds: recipe.categories.map((c) => c.categoryId),
    ingredients: recipe.ingredients.map((i) => ({
      name: i.ingredient.name,
      amount: i.amount?.toString() ?? "",
      unit: i.unit ?? "",
      note: i.note ?? "",
    })),
    images: recipe.images.map((img) => ({ id: img.id, path: img.path })),
  };

  const action = updateRecipeAction.bind(null, recipe.id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="font-hand text-5xl text-ink ink-text">Rezept bearbeiten</h1>
        <Link
          href={`/rezepte/${recipe.slug}`}
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          abbrechen
        </Link>
      </header>

      <RecipeEditor
        action={action}
        categories={categories}
        initial={initial}
        submitLabel="Änderungen speichern"
      />
    </main>
  );
}
