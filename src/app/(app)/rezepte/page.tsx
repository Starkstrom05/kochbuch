import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/lib/auth/auth";
import { signOutAction } from "@/lib/auth/actions";
import { prisma } from "@/lib/db/prisma";
import { searchRecipes } from "@/lib/recipes/search";
import { HandwrittenStars } from "@/components/oma/HandwrittenStars";
import { EmptyState } from "@/components/oma/EmptyState";
import { UpdateBanner } from "@/components/layout/UpdateBanner";
import { MobileMenu } from "@/components/layout/MobileMenu";

type View = "cards" | "photos" | "list";

type SearchParams = Promise<{
  q?: string;
  categoryId?: string;
  minStars?: string;
  view?: string;
}>;

function parseView(raw: string | undefined): View {
  return raw === "photos" || raw === "list" ? raw : "cards";
}

export default async function RezeptePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const { q, categoryId, minStars: minStarsRaw, view: viewRaw } = await searchParams;
  const minStars = minStarsRaw ? Number(minStarsRaw) : 0;
  const view = parseView(viewRaw);
  const [recipes, categories] = await Promise.all([
    searchRecipes({ q, categoryId, minStars: minStars > 0 ? minStars : undefined }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (categoryId) baseParams.set("categoryId", categoryId);
  if (minStars > 0) baseParams.set("minStars", String(minStars));
  const bookHref = baseParams.toString()
    ? `/rezepte/buch?${baseParams}`
    : "/rezepte/buch";
  const viewHref = (v: View) => {
    const sp = new URLSearchParams(baseParams);
    if (v !== "cards") sp.set("view", v);
    return sp.toString() ? `/rezepte?${sp}` : "/rezepte";
  };

  return (
    <>
    <Suspense fallback={null}>
      <UpdateBanner />
    </Suspense>
    <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
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
        {/* Desktop-Toolbar — ab sm sichtbar. */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/einkaufsliste"
            className="rounded-sm bg-paper-200 px-4 py-2 font-hand text-xl text-ink ring-1 ring-paper-300 hover:rotate-[-0.5deg]"
          >
            🛒 Liste
          </Link>
          <Link
            href="/vorraete"
            className="rounded-sm bg-paper-200 px-4 py-2 font-hand text-xl text-ink ring-1 ring-paper-300 hover:rotate-[-0.5deg]"
          >
            🥦 Vorrat
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
            href="/speiseplan"
            className="rounded-sm bg-paper-200 px-4 py-2 font-hand text-xl text-ink ring-1 ring-paper-300 hover:rotate-[-0.5deg]"
          >
            📅 Speiseplan
          </Link>
          <Link
            href="/rezepte/archiv"
            className="rounded-sm bg-paper-200 px-4 py-2 font-hand text-xl text-ink ring-1 ring-paper-300 hover:rotate-[-0.5deg]"
          >
            🗂 Archiv
          </Link>
          <Link
            href="/rezepte/neu"
            className="rounded-sm bg-ribbon px-4 py-2 font-hand text-xl text-paper-50 shadow-card hover:rotate-[-0.5deg]"
          >
            + Neues Rezept
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="font-written text-sm text-ribbon underline underline-offset-4"
            >
              Abmelden
            </button>
          </form>
        </div>

        {/* Mobile-Toolbar — nur sichtbar < sm. Primary + Burger. */}
        <div className="flex items-center gap-2 sm:hidden">
          <Link
            href="/rezepte/neu"
            className="inline-flex min-h-[44px] items-center rounded-sm bg-ribbon px-4 font-hand text-lg text-paper-50 shadow-card"
          >
            + Neu
          </Link>
          <MobileMenu
            bookHref={recipes.length > 0 ? bookHref : null}
            signOutAction={signOutAction}
          />
        </div>
      </header>

      <form method="get" className="paper-card mb-4 flex flex-wrap items-end gap-4 p-4">
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
          className="inline-flex min-h-[44px] items-center rounded-sm bg-paper-200 px-4 font-written text-sm text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
        >
          Suchen
        </button>
        {(q || categoryId || minStars > 0) ? (
          <Link
            href={view === "cards" ? "/rezepte" : `/rezepte?view=${view}`}
            className="font-written text-sm text-ribbon underline underline-offset-4"
          >
            zurücksetzen
          </Link>
        ) : null}
      </form>

      <div className="mb-6 flex items-center justify-between gap-4">
        <span className="font-written text-sm text-ink-faded">
          {recipes.length === 1
            ? "1 Rezept"
            : recipes.length > 0
              ? `${recipes.length} Rezepte`
              : ""}
        </span>
        <div className="inline-flex items-center rounded-sm bg-paper-200 p-1 ring-1 ring-paper-300">
          {([
            { v: "cards" as const, icon: "🗂", label: "Karten" },
            { v: "photos" as const, icon: "🖼", label: "Fotos" },
            { v: "list" as const, icon: "≡", label: "Liste" },
          ]).map((opt) => (
            <Link
              key={opt.v}
              href={viewHref(opt.v)}
              aria-label={opt.label}
              aria-current={view === opt.v ? "page" : undefined}
              className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-sm px-3 py-1 font-hand text-lg transition ${
                view === opt.v
                  ? "bg-paper-50 text-ink shadow-card"
                  : "text-ink-faded hover:text-ink"
              }`}
            >
              <span aria-hidden>{opt.icon}</span>
              <span className="ml-1 hidden sm:inline">{opt.label}</span>
            </Link>
          ))}
        </div>
      </div>

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
      ) : view === "cards" ? (
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
      ) : view === "photos" ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {recipes.map((r) => {
            const avg =
              r.ratings.length > 0
                ? r.ratings.reduce((a, b) => a + b.stars, 0) / r.ratings.length
                : 0;
            const cover = r.images[0]?.path;
            return (
              <li
                key={r.id}
                className="paper-card overflow-hidden p-0 transition hover:rotate-[-0.5deg]"
              >
                <Link href={`/rezepte/${r.slug}`} className="block">
                  <div className="aspect-square w-full bg-paper-200">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/images${cover}`}
                        alt=""
                        className="h-full w-full object-cover sepia-[0.1]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-hand text-5xl text-ink-light/40">
                        🍴
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-2 font-hand text-xl text-ink">
                      {r.title}
                    </h2>
                    {avg > 0 ? (
                      <div className="mt-1">
                        <HandwrittenStars value={avg} size={12} seed={r.id} />
                      </div>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="paper-card divide-y divide-paper-300 p-0">
          {recipes.map((r) => {
            const avg =
              r.ratings.length > 0
                ? r.ratings.reduce((a, b) => a + b.stars, 0) / r.ratings.length
                : 0;
            const cover = r.images[0]?.path;
            const totalMin = (r.prepMinutes ?? 0) + (r.cookMinutes ?? 0);
            return (
              <li key={r.id}>
                <Link
                  href={`/rezepte/${r.slug}`}
                  className="flex items-center gap-4 p-3 hover:bg-paper-200/50"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-paper-200">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/images${cover}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-hand text-2xl text-ink-light/40">
                        🍴
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-hand text-2xl text-ink">
                      {r.title}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {r.categories.slice(0, 3).map((c) => (
                        <span
                          key={c.categoryId}
                          className="rounded-sm bg-paper-200 px-2 py-0.5 font-written text-xs text-ink-faded"
                        >
                          {c.category.icon} {c.category.name}
                        </span>
                      ))}
                      {avg > 0 ? (
                        <HandwrittenStars value={avg} size={14} seed={r.id} />
                      ) : null}
                    </div>
                  </div>
                  {totalMin > 0 ? (
                    <span className="flex-shrink-0 font-written text-sm text-ink-faded">
                      ⏱ {totalMin} min
                    </span>
                  ) : null}
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
