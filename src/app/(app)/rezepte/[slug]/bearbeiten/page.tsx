import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { getRecipeBySlug } from "@/lib/recipes/server";
import { categoryVisibleToFamily } from "@/lib/recipes/visibility";
import { RecipeEditor } from "@/components/recipe/RecipeEditor";
import { updateRecipeAction } from "../../actions";

export default async function BearbeitenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const recipe = await getRecipeBySlug(slug, {
    id: session.user.id,
    role: session.user.role,
  });
  if (!recipe) notFound();
  const canWrite = session.user.role === "ADMIN" || recipe.cookbook?.ownerId === session.user.id;
  if (!canWrite) {
    redirect(`/rezepte/${slug}`);
  }

  const categories = await prisma.category.findMany({
    where: categoryVisibleToFamily(session.user.familyId),
    orderBy: { name: "asc" },
  });

  const initial = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description ?? "",
    servings: recipe.servings,
    prepMinutes: recipe.prepMinutes,
    cookMinutes: recipe.cookMinutes,
    difficulty: recipe.difficulty,
    instructions: recipe.instructions,
    steps: recipe.steps.map((s) => ({ text: s.text, durationSeconds: s.durationSeconds })),
    notes: recipe.notes ?? "",
    nutritionKcal: recipe.nutritionKcal,
    nutritionProteinG: recipe.nutritionProteinG,
    nutritionCarbsG: recipe.nutritionCarbsG,
    nutritionFatG: recipe.nutritionFatG,
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
    <main className="pt-safe px-safe pb-safe mx-auto max-w-4xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-hand text-ink ink-text text-5xl">Rezept bearbeiten</h1>
        <Link
          href={`/rezepte/${recipe.slug}`}
          className="font-written text-ribbon text-sm underline underline-offset-4"
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
