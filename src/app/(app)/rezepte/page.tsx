import { auth, signOut } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import Link from "next/link";

export default async function RezeptePage() {
  const session = await auth();
  const recipes = await prisma.recipe.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: {
      categories: { include: { category: true } },
      ratings: { select: { stars: true } },
    },
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="font-hand text-6xl text-ink ink-text">Rezeptbuch</h1>
          <p className="font-written text-ink-faded">
            Angemeldet als {session?.user?.name ?? session?.user?.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="font-written text-sm text-ribbon underline underline-offset-4"
          >
            Abmelden
          </button>
        </form>
      </header>

      {recipes.length === 0 ? (
        <div className="paper-card hand-tilt-2 mx-auto max-w-xl p-10 text-center">
          <p className="font-hand text-3xl text-ink">Noch keine Rezepte.</p>
          <p className="mt-2 font-written text-ink-faded">
            Lege dein erstes Rezept an — handschriftlich, oder einfach getippt.
          </p>
          <Link
            href="/rezepte/neu"
            className="mt-6 inline-block rounded-sm bg-ribbon px-6 py-2 font-hand text-2xl text-paper-50 shadow-card"
          >
            Neues Rezept
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r, i) => {
            const avg =
              r.ratings.length > 0
                ? r.ratings.reduce((a, b) => a + b.stars, 0) / r.ratings.length
                : 0;
            const tilt = ["hand-tilt-1", "hand-tilt-2", "hand-tilt-3"][i % 3];
            return (
              <li key={r.id} className={`paper-card ${tilt} p-5`}>
                <Link href={`/rezepte/${r.slug}`}>
                  <h2 className="font-hand text-3xl text-ink">{r.title}</h2>
                  {r.description ? (
                    <p className="mt-1 font-written text-ink-faded line-clamp-3">
                      {r.description}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {r.categories.map((c) => (
                      <span
                        key={c.categoryId}
                        className="rounded-sm bg-paper-200 px-2 py-0.5 font-written text-xs text-ink-faded"
                      >
                        {c.category.icon} {c.category.name}
                      </span>
                    ))}
                    {avg > 0 ? (
                      <span className="font-written text-sm text-ribbon">
                        {"★".repeat(Math.round(avg))}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
