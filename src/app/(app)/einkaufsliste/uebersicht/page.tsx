import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { actorFromSession } from "@/lib/auth/helpers";
import { listAccessibleLists, type AccessibleList } from "@/lib/shopping/permissions";
import { EmptyState } from "@/components/oma/EmptyState";

export default async function EinkaufslistenUebersichtPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const lists = await listAccessibleLists(actorFromSession(session));
  const own = lists.filter((l) => l.isOwn);
  const shared = lists.filter((l) => !l.isOwn);

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-2xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-hand text-ink ink-text text-5xl">Alle Listen</h1>
        <Link
          href="/einkaufsliste"
          className="font-written text-ink-faded text-sm underline underline-offset-4"
        >
          ← Meine Liste
        </Link>
      </header>

      {lists.length === 0 ? (
        <EmptyState
          illustration="shopping"
          title="Noch keine Listen."
          description="Lege über die Einkaufsliste eine an oder lass dir eine freigeben."
        />
      ) : (
        <div className="space-y-8">
          <ListSection title="Meine Listen" lists={own} />
          {shared.length > 0 && <ListSection title="Mit mir geteilt" lists={shared} showOwner />}
        </div>
      )}
    </main>
  );
}

function ListSection({
  title,
  lists,
  showOwner,
}: {
  title: string;
  lists: AccessibleList[];
  showOwner?: boolean;
}) {
  if (lists.length === 0) return null;
  return (
    <section>
      <h2 className="font-hand text-ribbon mb-3 text-2xl">{title}</h2>
      <ul className="space-y-2">
        {lists.map((l) => (
          <li key={l.id}>
            <Link
              href={`/einkaufsliste/${l.id}`}
              className="bg-paper-50 shadow-card ring-paper-300 hover:bg-paper-100 flex items-center justify-between rounded-sm px-4 py-3 ring-1"
            >
              <span className="font-written text-ink text-lg">{l.name}</span>
              <span className="font-written text-ink-faded text-sm">
                {showOwner ? `von ${l.owner.name} · ` : ""}
                {l.itemCount} {l.itemCount === 1 ? "Eintrag" : "Einträge"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
