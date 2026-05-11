import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { renderPdf } from "@/lib/pdf/render";

export const maxDuration = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true, title: true, createdById: true, isPublic: true },
  });
  if (!recipe) return NextResponse.json({ error: "Rezept nicht gefunden" }, { status: 404 });

  if (recipe.createdById !== session.user.id && !recipe.isPublic) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  try {
    const pdf = await renderPdf({ path: `/_print/recipe/${id}`, internal: true });
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
    console.error("PDF generation failed");
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen" }, { status: 500 });
  }
}
