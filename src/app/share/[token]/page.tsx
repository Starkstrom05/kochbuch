import { notFound } from "next/navigation";
import { getRecipeByShareToken } from "@/lib/recipes/server";
import { PaperSheet } from "@/components/oma/PaperSheet";
import { Divider } from "@/components/oma/Divider";
import { IngredientList } from "@/components/recipe/IngredientList";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const recipe = await getRecipeByShareToken(token);
  if (!recipe) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PaperSheet seed={recipe.id} variant="aged" className="p-8 sm:p-12">
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
          {recipe.prepMinutes != null ? <span>⏱ {recipe.prepMinutes} min</span> : null}
          {recipe.cookMinutes != null ? <span>🔥 {recipe.cookMinutes} min</span> : null}
        </div>

        <Divider className="my-8" />

        <section className="grid gap-10 sm:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-hand text-3xl text-ink">Zutaten</h2>
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
            <h2 className="font-hand text-3xl text-ink">Zubereitung</h2>
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

        <footer className="mt-10 flex items-center justify-between font-written text-xs text-ink-light">
          <span>aus Omas Kochbuch · geteilt mit Liebe</span>
          <a
            href={`/api/share/${token}/pdf`}
            download
            className="underline underline-offset-4 hover:text-ribbon"
          >
            📄 PDF herunterladen
          </a>
        </footer>
      </PaperSheet>
    </main>
  );
}
