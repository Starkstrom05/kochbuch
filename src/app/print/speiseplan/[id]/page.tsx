import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getAppName } from "@/lib/config/app-config";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const MEAL_TYPE_ORDER = ["Frühstück", "Mittagessen", "Abendessen", "Snack"];
const MEAL_COLORS: Record<string, string> = {
  "Frühstück":   "#7A8A5A",
  "Mittagessen": "#A23E2E",
  "Abendessen":  "#5C4A8A",
  "Snack":       "#8A6A2E",
};

export default async function PrintSpeiseplanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    include: {
      entries: {
        include: { recipe: { select: { title: true } } },
        orderBy: [{ dayIndex: "asc" }, { order: "asc" }],
      },
    },
  });

  if (!plan) notFound();

  // Date-Komponenten in UTC, sonst kann der Tag im Container je nach TZ
  // verschieben (weekStart kommt als UTC-Mitternacht aus der DB).
  const weekStart = new Date(plan.weekStart);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setUTCDate(weekStart.getUTCDate() + i);
    const dow = d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1;
    const entries = plan.entries
      .filter((e) => e.dayIndex === i)
      .sort(
        (a, b) =>
          MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType),
      );
    return {
      name: DAY_NAMES[dow],
      date: d.toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" }),
      entries,
    };
  });

  const dateFrom = weekStart.toLocaleDateString("de-DE", { day: "numeric", month: "numeric", timeZone: "UTC" });
  const dateTo = new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const printedAt = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 10mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; }
        body {
          font-family: var(--font-kalam, Georgia, serif);
          color: #1A1008;
          background: #FBF8EF;
          width: 277mm;
          height: 190mm;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        /* Header */
        .header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          padding-bottom: 3mm;
          border-bottom: 1.5px solid rgba(92,38,20,0.3);
          flex-shrink: 0;
        }
        .plan-title {
          font-family: var(--font-caveat, cursive);
          font-size: 28pt;
          font-weight: 700;
          color: #1A1008;
          line-height: 1;
          margin: 0;
        }
        .plan-subtitle {
          font-family: var(--font-lora, serif);
          font-size: 10pt;
          color: #5C4A30;
          margin-left: 4mm;
        }
        .brand {
          font-family: var(--font-caveat, cursive);
          font-size: 14pt;
          color: #A23E2E;
        }

        /* Week grid */
        .grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3mm;
          flex: 1;
          min-height: 0;
          margin-top: 3mm;
        }

        .day-col {
          display: flex;
          flex-direction: column;
          background: #FFFDF7;
          border: 0.5px solid rgba(92,38,20,0.15);
          border-radius: 1.5mm;
          overflow: hidden;
        }

        .day-header {
          background: rgba(162,62,46,0.08);
          border-bottom: 1px solid rgba(162,62,46,0.2);
          padding: 2mm 3mm 1.5mm;
          flex-shrink: 0;
        }
        .day-name {
          font-family: var(--font-caveat, cursive);
          font-size: 14pt;
          font-weight: 700;
          color: #5C2614;
          line-height: 1;
        }
        .day-date {
          font-family: var(--font-lora, serif);
          font-size: 8pt;
          color: #8B7355;
        }

        .day-entries {
          flex: 1;
          padding: 2mm;
          display: flex;
          flex-direction: column;
          gap: 2mm;
          overflow: hidden;
        }

        .entry {
          padding: 1.5mm 2mm;
          background: rgba(255,255,255,0.8);
          border-radius: 1mm;
          border-left: 2.5px solid #ccc;
        }
        .meal-type {
          font-family: var(--font-lora, serif);
          font-size: 7pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          line-height: 1;
          margin-bottom: 0.8mm;
        }
        .recipe-title {
          font-family: var(--font-kalam, Georgia, serif);
          font-size: 9.5pt;
          color: #1A1008;
          line-height: 1.25;
        }
        .servings {
          font-family: var(--font-lora, serif);
          font-size: 7pt;
          color: #8B7355;
          margin-top: 0.5mm;
        }

        .day-empty {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-lora, serif);
          font-size: 8pt;
          color: rgba(139,115,85,0.35);
        }

        /* Footer */
        .footer {
          flex-shrink: 0;
          margin-top: 3mm;
          padding-top: 2mm;
          border-top: 1px solid rgba(26,16,8,0.15);
          font-family: var(--font-lora, serif);
          font-size: 7.5pt;
          color: #8B7355;
          display: flex;
          justify-content: space-between;
        }
      `}</style>

      <div className="header">
        <div style={{ display: "flex", alignItems: "baseline", gap: "0" }}>
          <h1 className="plan-title">{plan.name}</h1>
          <span className="plan-subtitle">{dateFrom} – {dateTo}</span>
        </div>
        <span className="brand">{await getAppName()}</span>
      </div>

      <div className="grid">
        {days.map((day, i) => (
          <div key={i} className="day-col">
            <div className="day-header">
              <div className="day-name">{day.name}</div>
              <div className="day-date">{day.date}</div>
            </div>
            <div className="day-entries">
              {day.entries.length === 0 ? (
                <div className="day-empty">—</div>
              ) : (
                day.entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="entry"
                    style={{ borderLeftColor: MEAL_COLORS[entry.mealType] ?? "#8B7355" }}
                  >
                    <div
                      className="meal-type"
                      style={{ color: MEAL_COLORS[entry.mealType] ?? "#8B7355" }}
                    >
                      {entry.mealType}
                    </div>
                    <div className="recipe-title">{entry.recipe.title}</div>
                    <div className="servings">{entry.servings} Port.</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="footer">
        <span>Gedruckt am {printedAt}</span>
        <span>{plan.entries.length} Mahlzeit{plan.entries.length !== 1 ? "en" : ""} geplant</span>
      </div>
    </>
  );
}
