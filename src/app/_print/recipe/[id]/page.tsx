import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { formatAmount } from "@/lib/units/fraction";

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
    },
  });
  if (!recipe) notFound();

  const coverUrl = recipe.coverImagePath
    ? `${process.env.APP_URL ?? "http://localhost:3000"}/api/images${recipe.coverImagePath}`
    : null;

  const totalMinutes =
    (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0) || null;

  return (
    <>
      <style>{`
        @page { size: A5; margin: 12mm 14mm; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #FBF6E9; }
        body { font-family: var(--font-kalam, Georgia, serif); color: #1A1008; }

        /* Paper background */
        .page-bg {
          background-color: #FBF6E9;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
          min-height: 100vh;
          padding: 8mm 0;
        }

        /* Typography */
        h1 { font-family: var(--font-caveat, cursive); font-size: 32pt; line-height: 1.1; margin: 0 0 4mm; color: #1A1008; font-weight: 700; }
        h2 { font-family: var(--font-caveat, cursive); font-size: 18pt; margin: 0 0 3mm; color: #1A1008; font-weight: 600; }
        p, li { font-size: 10pt; line-height: 1.55; }
        .description { font-style: italic; color: #5C4A30; font-size: 11pt; margin: 0 0 4mm; }

        /* Metadata chips */
        .meta { display: flex; flex-wrap: wrap; gap: 3mm; margin: 3mm 0 5mm; font-family: var(--font-lora, serif); font-size: 9pt; color: #5C4A30; }
        .chip { background: rgba(162,62,46,0.08); border-radius: 2mm; padding: 1mm 3mm; }
        .chip-accent { background: rgba(162,62,46,0.18); }

        /* Divider */
        .divider { border: none; border-top: 1.5px solid rgba(162,62,46,0.3); margin: 4mm 0; }

        /* Cover image */
        .cover { width: 100%; max-height: 40mm; object-fit: cover; border-radius: 2mm; margin-bottom: 4mm; filter: sepia(0.15); }

        /* Two-column layout */
        .columns { display: grid; grid-template-columns: 2fr 3fr; gap: 6mm; margin-top: 5mm; }

        /* Ingredients */
        .ingredients ul { list-style: none; padding: 0; margin: 0; }
        .ingredients li { display: flex; gap: 2mm; padding: 1.5mm 0; border-bottom: 0.5px dotted rgba(26,16,8,0.2); font-size: 9.5pt; align-items: baseline; }
        .ing-amount { font-family: var(--font-lora, serif); font-size: 9pt; color: #5C4A30; white-space: nowrap; min-width: 14mm; }
        .ing-unit { font-family: var(--font-lora, serif); font-size: 9pt; color: #5C4A30; white-space: nowrap; min-width: 10mm; }
        .ing-name { flex: 1; }
        .ing-note { font-style: italic; color: #8B7355; font-size: 8pt; }

        /* Instructions */
        .instructions { font-size: 10pt; line-height: 1.6; white-space: pre-line; }

        /* Notes */
        .notes { margin-top: 5mm; padding: 3mm 4mm; background: rgba(139,111,71,0.07); border-left: 3px solid rgba(162,62,46,0.4); border-radius: 1mm; font-size: 9pt; font-style: italic; color: #5C4A30; }

        /* Footer */
        .footer { margin-top: 8mm; padding-top: 2mm; border-top: 1px solid rgba(26,16,8,0.15); font-family: var(--font-lora, serif); font-size: 7.5pt; color: #8B7355; display: flex; justify-content: space-between; }
      `}</style>

      <div className="page-bg">
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="Titelbild" className="cover" />
        )}

        <h1>{recipe.title}</h1>

        {recipe.description && <p className="description">{recipe.description}</p>}

        <div className="meta">
          <span className="chip chip-accent">🍽 {recipe.servings} Portionen</span>
          {recipe.prepMinutes != null && (
            <span className="chip">Vorbereitung: {recipe.prepMinutes} min</span>
          )}
          {recipe.cookMinutes != null && (
            <span className="chip">Kochen: {recipe.cookMinutes} min</span>
          )}
          {totalMinutes != null && (
            <span className="chip">Gesamt: {totalMinutes} min</span>
          )}
          {recipe.categories.map((c) => (
            <span key={c.categoryId} className="chip">
              {c.category.icon} {c.category.name}
            </span>
          ))}
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

          <div>
            <h2>Zubereitung</h2>
            <div className="instructions">{recipe.instructions}</div>
          </div>
        </div>

        {recipe.notes && (
          <div className="notes">
            <strong>Notizen:</strong> {recipe.notes}
          </div>
        )}

        <div className="footer">
          <span>Aus: Omas Kochbuch · {recipe.createdBy.name}</span>
          <span>
            {recipe.sourceUrl ? (
              <a href={recipe.sourceUrl}>{recipe.sourceUrl.replace(/^https?:\/\//, "").slice(0, 50)}</a>
            ) : (
              new Date(recipe.createdAt).toLocaleDateString("de-DE")
            )}
          </span>
        </div>
      </div>
    </>
  );
}
