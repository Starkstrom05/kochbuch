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
import { PdfLink } from "@/components/recipe/PdfLink";
import { CloneRecipeButton } from "@/components/recipe/CloneRecipeButton";
import { deactivateRecipeAction } from "../actions";
import packageJson from "../../../../../package.json";
import { addRecipeToListAction } from "../../einkaufsliste/actions";
import { AddToMealPlanButton } from "@/components/speiseplan/AddToMealPlanButton";
import { prisma } from "@/lib/db/prisma";
import { computeRecipeNutrition, resolveNutrition } from "@/lib/nutrition/compute";

export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ servings?: string | string[] }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const viewer = session?.user ? { id: session.user.id, role: session.user.role } : null;
  const recipe = await getRecipeBySlug(slug, viewer);
  if (!recipe) notFound();

  const sp = await searchParams;
  const servingsRaw = Array.isArray(sp.servings) ? sp.servings[0] : sp.servings;
  const servingsNum = servingsRaw ? Number(servingsRaw) : NaN;
  const initialServings = Number.isFinite(servingsNum) && servingsNum > 0 ? servingsNum : null;

  // Schreibrecht: Owner des zugehoerigen Cookbooks ODER ADMIN.
  const canWrite =
    !!session?.user &&
    (session.user.role === "ADMIN" || recipe.cookbook?.ownerId === session.user.id);
  const inActiveCookbook =
    !!session?.user?.activeCookbookId && recipe.cookbookId === session.user.activeCookbookId;

  // Fuer den Import-Button: Name des aktiven Cookbooks (nur laden, wenn relevant).
  const activeCookbook =
    session?.user?.activeCookbookId && !inActiveCookbook
      ? await prisma.cookbook.findUnique({
          where: { id: session.user.activeCookbookId },
          select: { name: true },
        })
      : null;

  // Quelle des Imports nachladen, falls vermerkt.
  const importSource =
    recipe.importedFromRecipeId && recipe.importedFromCookbookId
      ? await prisma.cookbook.findUnique({
          where: { id: recipe.importedFromCookbookId },
          select: { name: true, owner: { select: { name: true } } },
        })
      : null;

  const DAY_NAMES_LONG = [
    "Montag",
    "Dienstag",
    "Mittwoch",
    "Donnerstag",
    "Freitag",
    "Samstag",
    "Sonntag",
  ];
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
        d.setUTCDate(weekStart.getUTCDate() + i);
        const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
        return {
          index: i,
          label: `${DAY_NAMES_LONG[dow]}, ${d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" })}`,
        };
      }),
    };
  });
  const avg =
    recipe.ratings.length > 0
      ? recipe.ratings.reduce((a, b) => a + b.stars, 0) / recipe.ratings.length
      : 0;
  const myRating = session?.user
    ? (recipe.ratings.find((r) => r.user.id === session.user.id)?.stars ?? 0)
    : 0;

  const autoNutrition = computeRecipeNutrition(
    recipe.ingredients.map((ri) => ({
      amount: ri.amount,
      unit: ri.unit,
      density: ri.ingredient.density,
      nutrition: ri.ingredient.nutrition
        ? {
            kcal: ri.ingredient.nutrition.kcal,
            proteinG: ri.ingredient.nutrition.proteinG,
            carbsG: ri.ingredient.nutrition.carbsG,
            fatG: ri.ingredient.nutrition.fatG,
          }
        : null,
    })),
    recipe.servings,
  );
  const nutrition = resolveNutrition(autoNutrition, {
    kcal: recipe.nutritionKcal,
    proteinG: recipe.nutritionProteinG,
    carbsG: recipe.nutritionCarbsG,
    fatG: recipe.nutritionFatG,
  });
  const nutritionMacros = [
    nutrition.proteinG != null ? `Eiweiß ${Math.round(nutrition.proteinG)} g` : null,
    nutrition.carbsG != null ? `Kohlenh. ${Math.round(nutrition.carbsG)} g` : null,
    nutrition.fatG != null ? `Fett ${Math.round(nutrition.fatG)} g` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const nutritionLabel =
    nutrition.source === "manual"
      ? "angegeben"
      : nutrition.complete
        ? "geschätzt"
        : "geschätzt, unvollständig";

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-4xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <Link
          href="/rezepte"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          ← zur Übersicht
        </Link>
        {session?.user ? (
          <div className="font-written flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <Link
              href={`/rezepte/${recipe.slug}/koch`}
              className="text-ribbon underline underline-offset-4"
            >
              👨‍🍳 Koch-Modus
            </Link>
            {!inActiveCookbook && activeCookbook ? (
              <CloneRecipeButton recipeId={recipe.id} targetCookbookName={activeCookbook.name} />
            ) : null}
            {canWrite ? (
              <>
                <Link
                  href={`/rezepte/${recipe.slug}/bearbeiten`}
                  className="text-ribbon underline underline-offset-4"
                >
                  bearbeiten
                </Link>
                <Link
                  href={`/rezepte/${recipe.slug}/zeichnen`}
                  className="text-ink-faded hover:text-ribbon underline underline-offset-4"
                >
                  ✏️ Notiz
                </Link>
                <PdfLink
                  recipeId={recipe.id}
                  baseServings={recipe.servings}
                  className="text-ink-faded hover:text-ribbon underline underline-offset-4"
                >
                  📄 PDF
                </PdfLink>
                <form action={deactivateRecipeAction.bind(null, recipe.id)}>
                  <button type="submit" className="text-ink-faded hover:text-ribbon">
                    deaktivieren
                  </button>
                </form>
              </>
            ) : null}
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
        <h1 className="font-hand text-ink ink-text text-6xl">{recipe.title}</h1>

        {recipe.description ? (
          <p className="font-written text-ink-faded mt-2 text-xl italic">{recipe.description}</p>
        ) : null}

        <div className="font-written text-ink-faded mt-4 flex flex-wrap items-center gap-4 text-sm">
          {recipe.categories.map((c) => (
            <span key={c.categoryId} className="bg-paper-200 rounded-sm px-2 py-0.5">
              {c.category.icon} {c.category.name}
            </span>
          ))}
          {recipe.prepMinutes != null ? (
            <span>⏱ Vorbereitung: {recipe.prepMinutes} min</span>
          ) : null}
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
            {canWrite ? (
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
                className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1 text-sm ring-1"
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
            <h2 className="font-hand text-ink ink-text text-3xl">Zutaten</h2>
            <div className="mt-3">
              <IngredientList
                baseServings={recipe.servings}
                recipeId={recipe.id}
                initialServings={initialServings}
                ingredients={recipe.ingredients.map((i) => ({
                  amount: i.amount,
                  unit: i.unit,
                  note: i.note,
                  ingredient: i.ingredient,
                }))}
              />
            </div>

            {nutrition.source !== "none" && nutrition.kcal != null ? (
              <div className="bg-paper-100 ring-paper-200 mt-6 rounded-sm p-3 ring-1">
                <p className="font-written text-ink-faded text-xs tracking-wide uppercase">
                  Nährwerte pro Portion ({nutritionLabel})
                </p>
                <p className="font-hand text-ink mt-1 text-3xl">
                  ~{Math.round(nutrition.kcal)} kcal
                </p>
                {nutritionMacros ? (
                  <p className="font-written text-ink-faded mt-0.5 text-sm">{nutritionMacros}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div>
            <h2 className="font-hand text-ink ink-text text-3xl">Zubereitung</h2>
            <div className="font-written text-ink mt-3 text-lg leading-relaxed whitespace-pre-line">
              {recipe.instructions}
            </div>
          </div>
        </section>

        {recipe.notes ? (
          <>
            <Divider className="my-8" />
            <section>
              <h2 className="font-hand text-ink text-2xl">Notizen</h2>
              <p className="font-written text-ink-faded mt-2 whitespace-pre-line italic">
                {recipe.notes}
              </p>
            </section>
          </>
        ) : null}

        {recipe.handwrittenPath ? (
          <>
            <Divider className="my-8" />
            <section>
              <h2 className="font-hand text-ink text-2xl">Handschriftliche Notiz</h2>
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

        <footer className="font-written text-ink-light mt-10 flex items-center justify-between text-xs">
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
            {importSource ? (
              <>
                {" · "}
                {recipe.importedFromRecipe?.slug ? (
                  <Link href={`/rezepte/${recipe.importedFromRecipe.slug}`} className="underline">
                    importiert aus &bdquo;{importSource.name}&ldquo; von {importSource.owner.name}
                  </Link>
                ) : (
                  <span>
                    importiert aus &bdquo;{importSource.name}&ldquo; von {importSource.owner.name}
                  </span>
                )}
              </>
            ) : null}
          </span>
          <span>v{packageJson.version}</span>
        </footer>
      </PaperSheet>
    </main>
  );
}
