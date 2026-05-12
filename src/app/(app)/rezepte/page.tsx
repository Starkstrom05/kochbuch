import Link from "next/link";
import { Suspense } from "react";
import { auth, signOut } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { searchRecipes } from "@/lib/recipes/search";
import { HandwrittenStars } from "@/components/oma/HandwrittenStars";
import { EmptyState } from "@/components/oma/EmptyState";
import { UpdateBanner } from "@/components/layout/UpdateBanner";

type SearchParams = Promise<{
  q?: string;
  categoryId?: string;
  minStars?: string;
}>;

export default async function RezeptePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { q, categoryId, minStars: minStarsRaw } = await searchParams;
  const minStars = minStarsRaw ? Number(minStarsRaw) : 0;
  const [recipes, categories] = await Promise.all([
    searchRecipes({ q, categoryId, minStars: minStars > 0 ? minStars : undefined }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const bookQuery = new URLSearchParams();
  if (q) bookQuery.set("q", q);
  if (categoryId) bookQuery.set("categoryId", categoryId);
  if (minStars > 0) bookQuery.set("minStars", String(minStars));
  const bookHref = bookQuery.toString() ? `/rezepte/buch?${bookQuery}` : "/rezepte/buch";

  return (
    <>
    <Suspense fallback={null}>
      <UpdateBanner />
    </Suspense>
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-6xl text-ink ink-text">Rezeptbuch</h1>
          <p className="font-written text-ink-faded">
            Angemeldet als{" "}
            <Link
              href="/profil"
              className="underline decoration-dotted underline-offset-4 hover:text-ink"
            >
              {session?.user?.name ?? session?.user?.email}
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/einkaufsliste"
            className="rounded-sm bg-paper-200 px-4 py-2 font-hand text-xl text-ink ring-1 ring-paper-300 hover:rotate-[-0.5deg]"
          >
            🛒 Liste
          </Link>
          <Link
            href="/rezepte/importieren"
            className="rounded-sm bg-paper-200 px-4 py-2 font-hand text-xl text-ink ring-1 ring-paper-300 hover:rotate-[-0.5deg]"
          >
            ↓ Importieren
          </Link>
          {recipes.length > 0 ? (
            <Link
              href={bookHref}
              className="rounded-sm bg-amber-900/90 px-4 py-2 font-hand text-xl text-amber-50 shadow-card hover:rotate-[-0.5deg]"
            >
              📖 Als Buch lesen
            </Link>
          ) : null}
          <Link
            href="/rezepte/neu"
            className="rounded-sm bg-ribbon px-4 py-2 font-hand text-xl text-paper-50 shadow-card hover:rotate-[-0.5deg]"
          >
            + Neues Rezept
          </Link>
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
        </div>
      </header>

      <form method="get" className="paper-card mb-8 flex flex-wrap items-end gap-4 p-4">
        <label className="flex-1 min-w-[200px]">
          <span className="font-written text-sm text-ink-faded">Suche</span>
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Titel, Zutat, Tag..."
            className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
          />
        </label>
        <label>
          <span className="font-written text-sm text-ink-faded">Kategorie</span>
          <select
            name="categoryId"
            defaultValue={categoryId ?? ""}
            className="mt-1 block border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
          >
            <option value="">— alle —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-written text-sm text-ink-faded">Bewertung</span>
          <select
            name="minStars"
            defaultValue={minStars > 0 ? String(minStars) : ""}
            className="mt-1 block border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
          >
            <option value="">— alle —</option>
            <option value="5">★★★★★ nur 5 Sterne</option>
            <option value="4">★★★★ ab 4 Sterne</option>
            <option value="3">★★★ ab 3 Sterne</option>
            <option value="2">★★ ab 2 Sterne</option>
            <option value="1">★ mit Bewertung</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm bg-paper-200 px-4 py-2 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
        >
          Suchen
        </button>
        {(q || categoryId || minStars > 0) ? (
          <Link
            href="/rezepte"
            className="font-written text-sm text-ribbon underline underline-offset-4"
          >
            zurücksetzen
          </Link>
        ) : null}
      </form>

      {recipes.length === 0 ? (
        <EmptyState
          illustration={q || categoryId || minStars > 0 ? "search" : "recipes"}
          title={
            q || categoryId || minStars > 0
              ? "Nichts gefunden."
              : "Noch keine Rezepte."
          }
          description={
            q || categoryId || minStars > 0
              ? "Versuch's mit anderen Suchbegriffen oder Filtern."
              : "Lege dein erstes Rezept an — handschriftlich, oder einfach getippt."
          }
          action={
            !q && !categoryId && minStars === 0 ? (
              <Link
                href="/rezepte/neu"
                className="inline-block rounded-sm bg-ribbon px-6 py-2 font-hand text-2xl text-paper-50 shadow-card"
              >
                Neues Rezept
              </Link>
            ) : null
          }
        />
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
                    {avg > 0 ? <HandwrittenStars value={avg} size={16} seed={r.id} /> : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
    </>
  );
}
