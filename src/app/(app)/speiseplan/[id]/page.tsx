import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { WeekView } from "@/components/speiseplan/WeekView";

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

  const [plan, allRecipes] = await Promise.all([
    prisma.mealPlan.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            recipe: { select: { id: true, title: true, slug: true, servings: true } },
          },
          orderBy: [{ dayIndex: "asc" }, { order: "asc" }],
        },
      },
    }),
    prisma.recipe.findMany({
      where: { isActive: true },
      select: { id: true, title: true, servings: true },
      orderBy: { title: "asc" },
    }),
  ]);

  if (!plan) notFound();
  if (plan.ownerId !== session.user.id) redirect("/speiseplan");

  const weekStart = new Date(plan.weekStart);
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1; // 0=Mo … 6=So
    return {
      short: DAY_NAMES_SHORT[dow],
      long: DAY_NAMES_LONG[dow],
      date: d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric" }),
    };
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-hand text-5xl text-ink ink-text">{plan.name}</h1>
          <p className="font-written text-ink-faded">
            {weekStart.toLocaleDateString("de-DE", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <a
          href="/speiseplan"
          className="font-written text-sm text-ink-faded underline underline-offset-4"
        >
          ← alle Pläne
        </a>
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
      />
    </main>
  );
}
