import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { EmptyState } from "@/components/oma/EmptyState";
import { cookbookSharingPeerIds } from "@/lib/speiseplan/permissions";

export default async function SpeiseplanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const peerIds = await cookbookSharingPeerIds({
    id: session.user.id,
    role: session.user.role,
  });

  const plans = await prisma.mealPlan.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        ...(peerIds.length > 0 ? [{ familyShared: true, ownerId: { in: peerIds } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { entries: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-4xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-ink ink-text text-5xl">Speiseplan</h1>
          <p className="font-written text-ink-faded">Wochenpläne &amp; Mahlzeiten</p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/rezepte"
            className="font-written text-ink-faded text-sm underline underline-offset-4"
          >
            ← Rezepte
          </Link>
          <Link
            href="/speiseplan/neu"
            className="bg-ribbon font-hand text-paper-50 shadow-card inline-flex min-h-[44px] items-center rounded-sm px-4 text-xl hover:rotate-[-0.5deg]"
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
              className="bg-ribbon font-hand text-paper-50 shadow-card inline-block rounded-sm px-6 py-2 text-2xl"
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
              timeZone: "UTC",
            });
            return (
              <li key={plan.id} className={`paper-card ${tilt} p-5`}>
                <Link href={`/speiseplan/${plan.id}`}>
                  <h2 className="font-hand text-ink text-3xl">{plan.name}</h2>
                  <p className="font-written text-ink-faded mt-1">{dateStr}</p>
                  <p className="font-written text-ink-faded mt-2 text-sm">
                    {plan._count.entries} Mahlzeit{plan._count.entries !== 1 ? "en" : ""}
                  </p>
                  {plan.ownerId !== session.user.id ? (
                    <p className="font-written text-ribbon mt-1 text-xs">
                      🔗 von {plan.owner.name} geteilt
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
