import { notFound } from "next/navigation";
import { getRecipeByShareToken } from "@/lib/recipes/server";
import { getAppName } from "@/lib/config/app-config";
import { PaperSheet } from "@/components/oma/PaperSheet";
import { Divider } from "@/components/oma/Divider";
import { IngredientList } from "@/components/recipe/IngredientList";
import { SaveFileButton } from "@/components/common/SaveFileButton";

export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ servings?: string | string[] }>;
}) {
  const { token } = await params;
  const recipe = await getRecipeByShareToken(token);
  if (!recipe) notFound();

  const sp = await searchParams;
  const servingsRaw = Array.isArray(sp.servings) ? sp.servings[0] : sp.servings;
  const servingsNum = servingsRaw ? Number(servingsRaw) : NaN;
  const initialServings = Number.isFinite(servingsNum) && servingsNum > 0 ? servingsNum : null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <PaperSheet seed={recipe.id} variant="aged" className="p-8 sm:p-12">
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
          {recipe.prepMinutes != null ? <span>⏱ {recipe.prepMinutes} min</span> : null}
          {recipe.cookMinutes != null ? <span>🔥 {recipe.cookMinutes} min</span> : null}
        </div>

        <Divider className="my-8" />

        <section className="grid gap-10 sm:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-hand text-ink text-3xl">Zutaten</h2>
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
          </div>

          <div>
            <h2 className="font-hand text-ink text-3xl">Zubereitung</h2>
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

        <footer className="font-written text-ink-light mt-10 flex items-center justify-between text-xs">
          <span>aus {await getAppName()} · geteilt mit Liebe</span>
          <SaveFileButton
            url={`/api/share/${token}/pdf`}
            filename="rezept.pdf"
            busyLabel="⏳ PDF…"
            className="hover:text-ribbon underline underline-offset-4 disabled:opacity-60"
          >
            📄 PDF herunterladen
          </SaveFileButton>
        </footer>
      </PaperSheet>
    </main>
  );
}
