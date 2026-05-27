import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { renderPdf } from "@/lib/pdf/render";
import { canViewMealPlan } from "@/lib/speiseplan/permissions";

export const maxDuration = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { id } = await params;
  const plan = await prisma.mealPlan.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      ownerId: true,
      familyShared: true,
    },
  });

  if (!plan) return NextResponse.json({ error: "Plan nicht gefunden" }, { status: 404 });
  const canView = await canViewMealPlan({ id: session.user.id, role: session.user.role }, plan);
  if (!canView) {
    return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  }

  try {
    const pdf = await renderPdf({
      path: `/print/speiseplan/${id}`,
      internal: true,
      landscape: true,
    });

    const filename = plan.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    return new Response(pdf.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="speiseplan-${filename}.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (err) {
    console.error("Speiseplan-PDF-Generierung fehlgeschlagen", err);
    return NextResponse.json({ error: "PDF-Generierung fehlgeschlagen" }, { status: 500 });
  }
}
