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

export default async function VorraetePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [pantry, matches] = await Promise.all([
    getPantryForUser(session.user.id),
    matchRecipesForUser(session.user.id, session.user.familyId, 15),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-hand text-5xl text-ink ink-text">Vorrat</h1>
          <p className="font-written text-ink-faded">
            Trag ein, was du da hast — finde Rezepte mit den meisten Treffern.
          </p>
        </div>
        <Link
          href="/rezepte"
          className="font-written text-sm text-ribbon underline underline-offset-4"
        >
          ← Rezepte
        </Link>
      </header>

      {/* ── Pantry-Eingabe + Liste ───────────────────────────────────────── */}
      <section className="paper-card mb-8 p-5 sm:p-6">
        <h2 className="mb-3 font-hand text-3xl text-ink">Was hast du da?</h2>

        <form
          action={addPantryItemAction}
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <label className="flex-1 min-w-[160px]">
            <span className="font-written text-sm text-ink-faded">Zutat</span>
            <input
              name="name"
              required
              placeholder="z.B. Tomaten"
              className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
            />
          </label>
          <label className="w-24">
            <span className="font-written text-sm text-ink-faded">Menge</span>
            <input
              name="amount"
              inputMode="decimal"
              placeholder=""
              className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
            />
          </label>
          <label className="w-24">
            <span className="font-written text-sm text-ink-faded">Einheit</span>
            <input
              name="unit"
              placeholder="g, Stk…"
              className="mt-1 w-full border-b border-dotted border-ink-light bg-transparent font-serif text-ink outline-none"
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-[44px] items-center rounded-sm bg-ribbon px-4 font-hand text-lg text-paper-50 shadow-card"
          >
            + Hinzufügen
          </button>
        </form>

        {pantry.length === 0 ? (
          <p className="font-written text-sm text-ink-faded">
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
                      className="inline-flex items-center gap-1 rounded-sm bg-paper-200 px-3 py-1 ring-1 ring-paper-300"
                    >
                      <span className="font-written text-sm text-ink">{label}</span>
                      <button
                        type="submit"
                        aria-label={`${item.ingredient.name} entfernen`}
                        className="ml-1 font-hand text-base text-ink-faded hover:text-ribbon"
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
                className="font-written text-sm text-ink-faded underline underline-offset-4 hover:text-ribbon"
              >
                Vorrat komplett leeren
              </button>
            </form>
          </>
        )}
      </section>

      {/* ── Match-Ergebnisse ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 font-hand text-3xl text-ink">
          Was du damit kochen kannst
        </h2>

        {pantry.length === 0 ? (
          <p className="font-written text-ink-faded">
            Füge oben deine Vorratszutaten hinzu — passende Rezepte erscheinen
            dann hier.
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
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-sm bg-paper-200 font-hand text-3xl text-ink-light/50">
                        🍴
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/rezepte/${m.slug}`}
                        className="font-hand text-2xl text-ink hover:text-ribbon"
                      >
                        {m.title}
                      </Link>
                      <p className="mt-1 font-written text-sm text-ink-faded">
                        {m.matched.length} von {m.total} Zutaten vorhanden ({percent}%)
                      </p>
                      {m.missing.length > 0 ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          <span className="font-written text-xs text-ink-faded">
                            fehlt:
                          </span>
                          {m.missing.slice(0, 8).map((mi) => (
                            <span
                              key={mi.id}
                              className="rounded-sm bg-ribbon/10 px-2 py-0.5 font-written text-xs text-ribbon"
                            >
                              {mi.name}
                            </span>
                          ))}
                          {m.missing.length > 8 ? (
                            <span className="font-written text-xs text-ink-faded">
                              + {m.missing.length - 8} weitere
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-2 font-written text-sm text-emerald-700">
                          ✓ Alle Zutaten vorhanden
                        </p>
                      )}
                    </div>
                  </div>
                  {m.missing.length > 0 ? (
                    <form action={addMissing} className="mt-3">
                      <button
                        type="submit"
                        className="inline-flex min-h-[44px] items-center rounded-sm bg-paper-200 px-4 font-hand text-base text-ink ring-1 ring-paper-300 hover:bg-paper-300/60"
                      >
                        🛒 Fehlende auf Einkaufsliste
                      </button>
                    </form>
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
