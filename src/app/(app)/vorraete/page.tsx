import Link from "next/link";
import { auth } from "@/lib/auth/auth";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/oma/EmptyState";
import { getPantryForUser, matchRecipesForUser } from "@/lib/pantry/server";
import {
  addPantryItemAction,
  clearPantryAction,
  removePantryItemAction,
  addMissingToListAction,
} from "./actions";
import { AddToShoppingListButton } from "@/components/shopping/AddToShoppingListButton";
import { listAccessibleLists } from "@/lib/shopping/permissions";

export default async function VorraetePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [pantry, matches, accessibleLists] = await Promise.all([
    getPantryForUser(session.user.id),
    matchRecipesForUser(session.user.id, session.user.activeCookbookId, 15),
    listAccessibleLists({ id: session.user.id, role: session.user.role }),
  ]);
  const shoppingLists = accessibleLists.map((l) => ({
    id: l.id,
    name: l.name,
    isOwn: l.isOwn,
    ownerName: l.owner.name,
  }));

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-3xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-hand text-ink ink-text text-5xl">Vorrat</h1>
          <p className="font-written text-ink-faded">
            Trag ein, was du da hast — finde Rezepte mit den meisten Treffern.
          </p>
        </div>
        <Link
          href="/rezepte"
          className="font-written text-ribbon text-sm underline underline-offset-4"
        >
          ← Rezepte
        </Link>
      </header>

      {/* ── Pantry-Eingabe + Liste ───────────────────────────────────────── */}
      <section className="paper-card mb-8 p-5 sm:p-6">
        <h2 className="font-hand text-ink mb-3 text-3xl">Was hast du da?</h2>

        <form action={addPantryItemAction} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[160px] flex-1">
            <span className="font-written text-ink-faded text-sm">Zutat</span>
            <input
              name="name"
              required
              placeholder="z.B. Tomaten"
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect="off"
              className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
            />
          </label>
          <label className="w-24">
            <span className="font-written text-ink-faded text-sm">Menge</span>
            <input
              name="amount"
              inputMode="decimal"
              placeholder=""
              className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
            />
          </label>
          <label className="w-24">
            <span className="font-written text-ink-faded text-sm">Einheit</span>
            <input
              name="unit"
              placeholder="g, Stk…"
              className="border-ink-light text-ink mt-1 w-full border-b border-dotted bg-transparent font-serif outline-none"
            />
          </label>
          <button
            type="submit"
            className="bg-ribbon font-hand text-paper-50 shadow-card inline-flex min-h-[44px] items-center rounded-sm px-4 text-lg"
          >
            + Hinzufügen
          </button>
        </form>

        {pantry.length === 0 ? (
          <p className="font-written text-ink-faded text-sm">
            Noch kein Vorrat. Tipp deine erste Zutat ein.
          </p>
        ) : (
          <>
            <ul className="flex flex-wrap gap-2">
              {pantry.map((item) => {
                const removeBound = removePantryItemAction.bind(null, item.id);
                const label = [
                  item.amount != null ? String(item.amount) : null,
                  item.unit ?? null,
                  item.ingredient.name,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <li key={item.id}>
                    <form
                      action={removeBound}
                      className="bg-paper-200 ring-paper-300 inline-flex items-center gap-1 rounded-sm px-3 py-1 ring-1"
                    >
                      <span className="font-written text-ink text-sm">{label}</span>
                      <button
                        type="submit"
                        aria-label={`${item.ingredient.name} entfernen`}
                        className="font-hand text-ink-faded hover:text-ribbon ml-1 text-base"
                      >
                        ✕
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
            <form action={clearPantryAction} className="mt-4">
              <button
                type="submit"
                className="font-written text-ink-faded hover:text-ribbon text-sm underline underline-offset-4"
              >
                Vorrat komplett leeren
              </button>
            </form>
          </>
        )}
      </section>

      {/* ── Match-Ergebnisse ─────────────────────────────────────────────── */}
      <section>
        <h2 className="font-hand text-ink mb-4 text-3xl">Was du damit kochen kannst</h2>

        {pantry.length === 0 ? (
          <p className="font-written text-ink-faded">
            Füge oben deine Vorratszutaten hinzu — passende Rezepte erscheinen dann hier.
          </p>
        ) : matches.length === 0 ? (
          <EmptyState
            illustration="pantry"
            title="Noch keine passenden Rezepte."
            description="Versuch's mit ein paar mehr Zutaten — oder leg ein neues Rezept an, das die nutzt."
          />
        ) : (
          <ul className="space-y-4">
            {matches.map((m) => {
              const addMissing = addMissingToListAction.bind(null, m.recipeId);
              const percent = Math.round(m.ratio * 100);
              return (
                <li key={m.recipeId} className="paper-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-start gap-4">
                    {m.coverPath ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/images${m.coverPath}`}
                        alt=""
                        className="h-20 w-20 flex-shrink-0 rounded-sm object-cover sepia-[0.1]"
                      />
                    ) : (
                      <div className="bg-paper-200 font-hand text-ink-light/50 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-sm text-3xl">
                        🍴
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/rezepte/${m.slug}`}
                        className="font-hand text-ink hover:text-ribbon text-2xl"
                      >
                        {m.title}
                      </Link>
                      <p className="font-written text-ink-faded mt-1 text-sm">
                        {m.matched.length} von {m.total} Zutaten vorhanden ({percent}%)
                      </p>
                      {m.missing.length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="font-written text-ink-faded text-xs">fehlt:</span>
                          {m.missing.slice(0, 8).map((mi) => (
                            <span
                              key={mi.id}
                              className="bg-ribbon/10 font-written text-ribbon rounded-sm px-2 py-0.5 text-xs"
                            >
                              {mi.name}
                            </span>
                          ))}
                          {m.missing.length > 8 ? (
                            <span className="font-written text-ink-faded text-xs">
                              + {m.missing.length - 8} weitere
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="font-written mt-2 text-sm text-emerald-700">
                          ✓ Alle Zutaten vorhanden
                        </p>
                      )}
                    </div>
                  </div>
                  {m.missing.length > 0 ? (
                    <div className="mt-3">
                      <AddToShoppingListButton
                        lists={shoppingLists}
                        label="🛒 Fehlende auf Einkaufsliste"
                        buttonClassName="bg-paper-200 font-hand text-ink ring-paper-300 hover:bg-paper-300/60 inline-flex min-h-[44px] items-center rounded-sm px-4 text-base ring-1"
                        action={addMissing}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
