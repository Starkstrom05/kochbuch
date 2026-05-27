import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { WeekView } from "@/components/speiseplan/WeekView";
import { togglePlanShareAction } from "../actions";
import { readableCookbookIds } from "@/lib/cookbooks/permissions";

type Props = { params: Promise<{ id: string }> };

const DAY_NAMES_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const DAY_NAMES_LONG = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

export default async function SpeiseplanDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;

  const cookbookIds = await readableCookbookIds({
    id: session.user.id,
    role: session.user.role,
  });

  const [plan, allRecipes] = await Promise.all([
    prisma.mealPlan.findUnique({
      where: { id },
      include: {
        owner: { select: { familyId: true } },
        entries: {
          include: {
            recipe: { select: { id: true, title: true, slug: true, servings: true } },
          },
          orderBy: [{ dayIndex: "asc" }, { order: "asc" }],
        },
      },
    }),
    prisma.recipe.findMany({
      where: { isActive: true, cookbookId: { in: cookbookIds } },
      select: { id: true, title: true, servings: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!plan) notFound();
  const isOwner = plan.ownerId === session.user.id;
  const canView = isOwner || (plan.familyShared && plan.owner.familyId === session.user.familyId);
  if (!canView) redirect("/speiseplan");

  // Dates aus der DB sind UTC. Lokale getDate/getDay würde je nach
  // Container-TZ den Wochentag um 1 verschieben — UTC-Komponenten und
  // toLocaleDateString({ timeZone: "UTC" }) halten das konsistent.
  const weekStart = new Date(plan.weekStart);
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1; // 0=Mo … 6=So
    return {
      short: DAY_NAMES_SHORT[dow],
      long: DAY_NAMES_LONG[dow],
      date: d.toLocaleDateString("de-DE", {
        day: "numeric",
        month: "numeric",
        timeZone: "UTC",
      }),
    };
  });

  return (
    <main className="pt-safe px-safe pb-safe mx-auto max-w-7xl px-4 pt-6 pb-10 sm:px-6 sm:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-ink ink-text text-5xl">{plan.name}</h1>
          <p className="font-written text-ink-faded">
            {weekStart.toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isOwner ? (
            <form action={togglePlanShareAction.bind(null, plan.id)}>
              <button
                type="submit"
                className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
              >
                {plan.familyShared ? "🔗 Freigabe aufheben" : "Für Familie freigeben"}
              </button>
            </form>
          ) : null}
          <a
            href={`/api/speiseplan/${plan.id}/pdf`}
            download
            className="bg-paper-200 font-written text-ink ring-paper-300 hover:bg-paper-300/60 rounded-sm px-3 py-1.5 text-sm ring-1"
          >
            📄 PDF
          </a>
          <Link
            href="/speiseplan"
            className="font-written text-ink-faded text-sm underline underline-offset-4"
          >
            ← alle Pläne
          </Link>
        </div>
      </header>

      <WeekView
        planId={plan.id}
        planName={plan.name}
        dayLabels={dayLabels}
        entries={plan.entries.map((e) => ({
          id: e.id,
          dayIndex: e.dayIndex,
          mealType: e.mealType,
          servings: e.servings,
          recipe: e.recipe,
        }))}
        allRecipes={allRecipes}
        canEdit={isOwner}
      />
    </main>
  );
}
