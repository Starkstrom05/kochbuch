import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { renderPdf } from "@/lib/pdf/render";
import { canReadRecipe } from "@/lib/cookbooks/permissions";

export const maxDuration = 120;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true, title: true, cookbookId: true, isPublic: true },
  });
  if (!recipe) return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });

  const canView =
    recipe.isPublic ||
    (await canReadRecipe({ id: session.user.id, role: session.user.role }, recipe));
  if (!canView) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  try {
    const servings = new URL(req.url).searchParams.get("servings");
    const printPath = servings
      ? `/print/recipe/${id}?servings=${encodeURIComponent(servings)}`
      : `/print/recipe/${id}`;
    const pdf = await renderPdf({ path: printPath, internal: true });
    const filename = recipe.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    return new Response(pdf.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen" }, { status: 500 });
  }
}
