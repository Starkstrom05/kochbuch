import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { getArchivedRecipes } from "@/lib/recipes/server";
import { PaperSheet } from "@/components/oma/PaperSheet";
import { restoreRecipeAction, permanentlyDeleteRecipeAction } from "../actions";

export default async function ArchivPage() {
  const session = await auth();
  if (!session?.user) return null;

  const recipes = await getArchivedRecipes(session.user.id);

  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-hand text-5xl text-ink ink-text">Archiv</h1>
        <Link
          href="/rezepte"
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          ← zur Übersicht
        </Link>
      </header>

      {recipes.length === 0 ? (
        <PaperSheet seed="archiv" className="p-8 text-center">
          <p className="font-written text-xl text-ink-faded">Keine deaktivierten Rezepte.</p>
        </PaperSheet>
      ) : (
        <ul className="flex flex-col gap-4">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <PaperSheet seed={recipe.id} className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0">
                  <p className="font-hand text-2xl text-ink opacity-60">{recipe.title}</p>
                  {recipe.categories.length > 0 ? (
                    <p className="mt-1 font-written text-sm text-ink-faded">
                      {recipe.categories.map((c) => `${c.category.icon} ${c.category.name}`).join(" · ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-4 font-written text-sm">
                  <form
                    action={async () => {
                      "use server";
                      await restoreRecipeAction(recipe.id);
                    }}
                  >
                    <button type="submit" className="text-ribbon underline underline-offset-4">
                      wiederherstellen
                    </button>
                  </form>
                  <form
                    action={async () => {
                      "use server";
                      await permanentlyDeleteRecipeAction(recipe.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-ink-faded hover:text-red-700"
                    >
                      endgültig löschen
                    </button>
                  </form>
                </div>
              </PaperSheet>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
