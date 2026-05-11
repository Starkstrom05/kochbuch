import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { renderPdf } from "@/lib/pdf/render";

export const maxDuration = 120;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const recipe = await prisma.recipe.findFirst({
    where: { shareToken: token, isPublic: true },
    select: { id: true, title: true },
  });
  if (!recipe) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  try {
    const pdf = await renderPdf({ path: `/_print/recipe/${recipe.id}`, internal: true });
    const filename = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    return new Response(pdf.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (err) {
    console.error("Share PDF failed");
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen" }, { status: 500 });
  }
}
