import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getRecipeBySlug } from "@/lib/recipes/server";
import { PaperSheet } from "@/components/oma/PaperSheet";
import { Divider } from "@/components/oma/Divider";
import { HandwrittenStars } from "@/components/oma/HandwrittenStars";
import { IngredientList } from "@/components/recipe/IngredientList";
import { RatingPicker } from "@/components/recipe/RatingPicker";
import { ShareToggle } from "@/components/recipe/ShareToggle";
import Image from "next/image";
import { RecipeGallery } from "@/components/recipe/RecipeGallery";
import { deactivateRecipeAction } from "../actions";
import packageJson from "../../../../../package.json";
import { addRecipeToListAction } from "../../einkaufsliste/actions";
import { AddToMealPlanButton } from "@/components/speiseplan/AddToMealPlanButton";
import { prisma } from "@/lib/db/prisma";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) notFound();

  const session = await auth();
  const isOwner = session?.user?.id === recipe.createdById;

  const DAY_NAMES_LONG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
  const mealPlans = session?.user
    ? await prisma.mealPlan.findMany({
        where: { ownerId: session.user.id },
        select: { id: true, name: true, weekStart: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const planOptions = mealPlans.map((plan) => {
    const weekStart = new Date(plan.weekStart);
    return {
      id: plan.id,
      name: plan.name,
      days: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
        return {
          index: i,
          label: `${DAY_NAMES_LONG[dow]}, ${d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" })}`,
        };
      }),
    };
  });
  const avg =
    recipe.ratings.length > 0
      ? recipe.ratings.reduce((a, b) => a + b.stars, 0) / recipe.ratings.length
      : 0;
  const myRating =
    session?.user
      ? recipe.ratings.find((r) => r.user.id === session.user.id)?.stars ?? 0
      : 0;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <Link href="/rezepte" className="font-written text-sm text-ribbon underline underline-offset-4">
          ← zur Übersicht
        </Link>
        {isOwner ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-written text-sm">
            <Link
              href={`/rezepte/${recipe.slug}/bearbeiten`}
              className="text-ribbon underline underline-offset-4"
            >
              bearbeiten
            </Link>
            <Link
              href={`/rezepte/${recipe.slug}/zeichnen`}
              className="text-ink-faded underline underline-offset-4 hover:text-ribbon"
            >
              ✏️ Notiz
            </Link>
            <a
              href={`/api/recipes/${recipe.id}/pdf`}
              download
              className="text-ink-faded underline underline-offset-4 hover:text-ribbon"
            >
              📄 PDF
            </a>
            <form
              action={async () => {
                "use server";
                await deactivateRecipeAction(recipe.id);
              }}
            >
              <button type="submit" className="text-ink-faded hover:text-ribbon">
                deaktivieren
              </button>
            </form>
          </div>
        ) : null}
      </header>

      <RecipeGallery
        images={recipe.images.map((img) => ({
          id: img.id,
          path: img.path,
          caption: img.caption,
        }))}
      />

      <PaperSheet seed={recipe.id} className="mt-4 p-8 sm:p-12">
        <h1 className="font-hand text-6xl text-ink ink-text">{recipe.title}</h1>

        {recipe.description ? (
          <p className="mt-2 font-written text-xl italic text-ink-faded">{recipe.description}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-4 font-written text-sm text-ink-faded">
          {recipe.categories.map((c) => (
            <span key={c.categoryId} className="rounded-sm bg-paper-200 px-2 py-0.5">
              {c.category.icon} {c.category.name}
            </span>
          ))}
          {recipe.prepMinutes != null ? <span>⏱ Vorbereitung: {recipe.prepMinutes} min</span> : null}
          {recipe.cookMinutes != null ? <span>🔥 Kochen: {recipe.cookMinutes} min</span> : null}
          {avg > 0 ? (
            <span className="flex items-center gap-1">
              <HandwrittenStars value={avg} seed={recipe.id} />
              <span className="text-ink-light">({recipe.ratings.length})</span>
            </span>
          ) : null}
        </div>

        {session?.user ? (
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <RatingPicker recipeId={recipe.id} initial={myRating} seed={recipe.id} />
            {isOwner ? (
              <ShareToggle
                recipeId={recipe.id}
                initialPublic={recipe.isPublic}
                initialToken={recipe.shareToken}
              />
            ) : null}
            <form
              action={async () => {
                "use server";
                await addRecipeToListAction(recipe.id);
              }}
            >
              <button
                type="submit"
                className="rounded-sm bg-paper-200 px-3 py-1 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
              >
                🛒 Zur Einkaufsliste
              </button>
            </form>
            <AddToMealPlanButton
              recipeId={recipe.id}
              defaultServings={recipe.servings}
              plans={planOptions}
            />
          </div>
        ) : null}

        <Divider className="my-8" />

        <section className="grid gap-10 sm:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-hand text-3xl text-ink ink-text">Zutaten</h2>
            <div className="mt-3">
              <IngredientList
                baseServings={recipe.servings}
                ingredients={recipe.ingredients.map((i) => ({
                  amount: i.amount,
                  unit: i.unit,
                  note: i.note,
                  ingredient: i.ingredient,
                }))}
              />
            </div>
          </div>

          <div>
            <h2 className="font-hand text-3xl text-ink ink-text">Zubereitung</h2>
            <div className="mt-3 whitespace-pre-line font-written text-lg leading-relaxed text-ink">
              {recipe.instructions}
            </div>
          </div>
        </section>

        {recipe.notes ? (
          <>
            <Divider className="my-8" />
            <section>
              <h2 className="font-hand text-2xl text-ink">Notizen</h2>
              <p className="mt-2 whitespace-pre-line font-written italic text-ink-faded">
                {recipe.notes}
              </p>
            </section>
          </>
        ) : null}

        {recipe.handwrittenPath ? (
          <>
            <Divider className="my-8" />
            <section>
              <h2 className="font-hand text-2xl text-ink">Handschriftliche Notiz</h2>
              <div className="relative mt-3 overflow-hidden rounded-sm">
                <Image
                  src={`/api/images${recipe.handwrittenPath}`}
                  alt="Handschriftliche Notiz"
                  width={800}
                  height={600}
                  className="w-full"
                  unoptimized
                />
              </div>
            </section>
          </>
        ) : null}

        <footer className="mt-10 flex items-center justify-between font-written text-xs text-ink-light">
          <span>
            angelegt von {recipe.createdBy.name}
            {recipe.sourceUrl ? (
              <>
                {" · "}
                <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="underline">
                  Quelle
                </a>
              </>
            ) : null}
          </span>
          <span>v{packageJson.version}</span>
        </footer>
      </PaperSheet>
    </main>
  );
}
