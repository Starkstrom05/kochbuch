import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { EmptyState } from "@/components/oma/EmptyState";

export default async function SpeiseplanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plans = await prisma.mealPlan.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });

  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 pt-6 pt-safe px-safe pb-safe sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl text-ink ink-text">Speiseplan</h1>
          <p className="font-written text-ink-faded">Wochenpläne &amp; Mahlzeiten</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/rezepte"
            className="font-written text-sm text-ink-faded underline underline-offset-4"
          >
            ← Rezepte
          </Link>
          <Link
            href="/speiseplan/neu"
            className="inline-flex min-h-[44px] items-center rounded-sm bg-ribbon px-4 font-hand text-xl text-paper-50 shadow-card hover:rotate-[-0.5deg]"
          >
            + Neuer Plan
          </Link>
        </div>
      </header>

      {plans.length === 0 ? (
        <EmptyState
          illustration="notes"
          title="Noch kein Speiseplan."
          description="Lege deinen ersten Wochenplan an und plane deine Mahlzeiten."
          action={
            <Link
              href="/speiseplan/neu"
              className="inline-block rounded-sm bg-ribbon px-6 py-2 font-hand text-2xl text-paper-50 shadow-card"
            >
              Neuer Plan
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, i) => {
            const tilt = ["hand-tilt-1", "hand-tilt-2", "hand-tilt-3"][i % 3];
            const weekStart = new Date(plan.weekStart);
            const dateStr = weekStart.toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return (
              <li key={plan.id} className={`paper-card ${tilt} p-5`}>
                <Link href={`/speiseplan/${plan.id}`}>
                  <h2 className="font-hand text-3xl text-ink">{plan.name}</h2>
                  <p className="mt-1 font-written text-ink-faded">{dateStr}</p>
                  <p className="mt-2 font-written text-sm text-ink-faded">
                    {plan._count.entries} Mahlzeit{plan._count.entries !== 1 ? "en" : ""}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
