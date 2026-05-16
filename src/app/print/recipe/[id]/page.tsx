import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatAmount } from "@/lib/units/fraction";
import { getAppName } from "@/lib/config/app-config";

export const dynamic = "force-dynamic";

export default async function PrintRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      ingredients: { include: { ingredient: true }, orderBy: { order: "asc" } },
      categories: { include: { category: true } },
      createdBy: { select: { name: true } },
      images: { orderBy: { order: "asc" }, select: { path: true } },
    },
  });
  if (!recipe) notFound();

  const coverImagePath = recipe.images[0]?.path ?? null;
  const internalBase = process.env.APP_URL ?? "http://localhost:3000";
  const coverUrl = coverImagePath ? `${internalBase}/api/images${coverImagePath}` : null;

  const totalMinutes =
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || null;

  const steps = recipe.instructions
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const printedAt = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <>
      <style>{`
        @page { size: A4; margin: 12mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #ffffff; }
        body {
          font-family: var(--font-kalam, Georgia, serif);
          color: #1A1008;
          background: #ffffff;
          /* A4: 210×297mm. Mit margin 12mm bleiben 186×273mm Content-Area.
             overflow:hidden zwingt eine Seite. */
          height: 273mm;
          width: 186mm;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        h1 {
          font-family: var(--font-caveat, cursive);
          font-size: 34pt;
          line-height: 1.0;
          margin: 0 0 2mm;
          color: #1A1008;
          font-weight: 700;
        }
        h2 {
          font-family: var(--font-caveat, cursive);
          font-size: 19pt;
          margin: 0 0 3mm;
          color: #5C2614;
          font-weight: 600;
        }
        p, li { font-size: 11pt; line-height: 1.5; }
        .description {
          font-style: italic;
          color: #5C4A30;
          font-size: 11.5pt;
          margin: 0 0 3mm;
          max-width: 95%;
        }

        /* Header mit Titel + Polaroid */
        .header {
          position: relative;
          margin-bottom: 4mm;
          min-height: 52mm;
          flex-shrink: 0;
        }
        .header-text { padding-right: 62mm; }
        .polaroid {
          position: absolute;
          top: 0mm;
          right: 0mm;
          width: 58mm;
          background: #FBF8EF;
          padding: 3mm 3mm 9mm;
          box-shadow:
            0 4mm 7mm rgba(20, 12, 6, 0.2),
            0 1.5mm 3mm rgba(20, 12, 6, 0.12);
          border: 0.5px solid rgba(0,0,0,0.08);
          transform: rotate(-4deg);
        }
        .polaroid::before,
        .polaroid::after {
          content: "";
          position: absolute;
          width: 18mm;
          height: 5mm;
          background: rgba(230, 200, 110, 0.55);
          border: 0.3px solid rgba(170, 130, 50, 0.3);
          top: -2.5mm;
        }
        .polaroid::before { left: -4mm; transform: rotate(-30deg); }
        .polaroid::after  { right: -4mm; transform: rotate(28deg); }
        .polaroid img {
          width: 100%;
          height: 38mm;
          object-fit: cover;
          filter: sepia(0.18);
          display: block;
        }
        .polaroid-caption {
          margin-top: 1.5mm;
          font-family: var(--font-caveat, cursive);
          font-size: 10pt;
          color: #5C4A30;
          text-align: center;
          line-height: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Meta-Chips */
        .meta {
          display: flex;
          flex-wrap: wrap;
          gap: 2.5mm;
          margin: 2mm 0 3mm;
          font-family: var(--font-lora, serif);
          font-size: 9.5pt;
          color: #5C4A30;
        }
        .chip {
          background: rgba(162,62,46,0.07);
          border: 0.3px solid rgba(162,62,46,0.15);
          border-radius: 1.5mm;
          padding: 1mm 3mm;
        }
        .chip-accent { background: rgba(162,62,46,0.18); color: #5C2614; }

        /* Divider mit Stern */
        .divider {
          border: none;
          border-top: 1.3px solid rgba(92, 38, 20, 0.3);
          margin: 3mm 0;
          position: relative;
          flex-shrink: 0;
        }
        .divider::after {
          content: "✦";
          position: absolute;
          top: -3.5mm;
          left: 50%;
          transform: translateX(-50%);
          background: #ffffff;
          padding: 0 2.5mm;
          color: rgba(162, 62, 46, 0.4);
          font-size: 8pt;
        }

        /* Zwei-Spalten-Layout */
        .columns {
          display: grid;
          grid-template-columns: 2fr 3fr;
          gap: 8mm;
          margin-top: 3mm;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }

        /* Zutaten */
        .ingredients h2 { margin-bottom: 2mm; }
        .ingredients ul { list-style: none; padding: 0; margin: 0; }
        .ingredients li {
          display: flex;
          gap: 2mm;
          padding: 1.2mm 0;
          border-bottom: 0.5px dotted rgba(26,16,8,0.22);
          font-size: 10.5pt;
          line-height: 1.4;
          align-items: baseline;
        }
        .ing-amount {
          font-family: var(--font-lora, serif);
          font-size: 10pt;
          color: #5C4A30;
          white-space: nowrap;
          min-width: 14mm;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
        .ing-unit {
          font-family: var(--font-lora, serif);
          font-size: 10pt;
          color: #5C4A30;
          white-space: nowrap;
          min-width: 10mm;
          flex-shrink: 0;
        }
        .ing-name { flex: 1; }
        .ing-note { font-style: italic; color: #8B7355; font-size: 9pt; }

        /* Anleitung */
        .instructions h2 { margin-bottom: 2.5mm; }
        .instructions ol { list-style: none; padding: 0; margin: 0; }
        .instructions li {
          display: flex;
          gap: 3mm;
          margin-bottom: 3mm;
          font-size: 11pt;
          line-height: 1.55;
        }
        .step-num {
          font-family: var(--font-caveat, cursive);
          font-size: 16pt;
          line-height: 1;
          color: #A23E2E;
          flex-shrink: 0;
          min-width: 7mm;
          font-weight: 700;
        }

        /* Notizen */
        .notes {
          margin-top: 4mm;
          padding: 2.5mm 3mm;
          background: rgba(230, 200, 110, 0.12);
          border-left: 3px solid rgba(162,62,46,0.4);
          border-radius: 1mm;
          font-size: 10pt;
          font-style: italic;
          color: #5C4A30;
          flex-shrink: 0;
        }
        .notes strong {
          font-family: var(--font-caveat, cursive);
          font-size: 12pt;
          font-style: normal;
          color: #5C2614;
          margin-right: 2mm;
        }

        /* Footer */
        .footer {
          margin-top: 4mm;
          padding-top: 2mm;
          border-top: 1px solid rgba(26,16,8,0.15);
          font-family: var(--font-lora, serif);
          font-size: 8.5pt;
          color: #8B7355;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          flex-shrink: 0;
          gap: 4mm;
        }
        .footer a { color: #8B7355; text-decoration: none; }
        .footer-mid {
          font-variant-numeric: tabular-nums;
          flex-shrink: 0;
        }
        .brand {
          font-family: var(--font-caveat, cursive);
          font-size: 12pt;
          color: #5C2614;
        }
      `}</style>

      <div className="header">
        {coverUrl && (
          <div className="polaroid">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverUrl} alt="Titelbild" />
            <div className="polaroid-caption">{recipe.title}</div>
          </div>
        )}
        <div className="header-text">
          <h1>{recipe.title}</h1>
          {recipe.description && <p className="description">{recipe.description}</p>}
          <div className="meta">
            <span className="chip chip-accent">🍽 {recipe.servings} Portionen</span>
            {recipe.prepMinutes != null && (
              <span className="chip">Vorbereitung {recipe.prepMinutes} min</span>
            )}
            {recipe.cookMinutes != null && (
              <span className="chip">Kochen {recipe.cookMinutes} min</span>
            )}
            {totalMinutes != null && recipe.prepMinutes != null && recipe.cookMinutes != null && (
              <span className="chip">Gesamt {totalMinutes} min</span>
            )}
            {recipe.categories.map((c) => (
              <span key={c.categoryId} className="chip">
                {c.category.icon} {c.category.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <hr className="divider" />

      <div className="columns">
        <div className="ingredients">
          <h2>Zutaten</h2>
          <ul>
            {recipe.ingredients.map((ri) => (
              <li key={ri.id}>
                <span className="ing-amount">
                  {ri.amount != null ? formatAmount(ri.amount) : ""}
                </span>
                <span className="ing-unit">{ri.unit ?? ""}</span>
                <span className="ing-name">
                  {ri.ingredient.name}
                  {ri.note && <span className="ing-note"> ({ri.note})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="instructions">
          <h2>Zubereitung</h2>
          <ol>
            {steps.map((step, i) => (
              <li key={i}>
                <span className="step-num">{i + 1}.</span>
                <span>{step.replace(/^\d+\.\s*/, "")}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {recipe.notes && (
        <div className="notes">
          <strong>Notiz</strong>
          {recipe.notes}
        </div>
      )}

      <div className="footer">
        <span>
          <span className="brand">{await getAppName()}</span> · {recipe.createdBy.name}
        </span>
        <span className="footer-mid">Gedruckt am {printedAt}</span>
        <span>
          {recipe.sourceUrl ? (
            <a href={recipe.sourceUrl}>
              {recipe.sourceUrl.replace(/^https?:\/\//, "").slice(0, 40)}
            </a>
          ) : (
            <>Angelegt am {new Date(recipe.createdAt).toLocaleDateString("de-DE")}</>
          )}
        </span>
      </div>
    </>
  );
}
