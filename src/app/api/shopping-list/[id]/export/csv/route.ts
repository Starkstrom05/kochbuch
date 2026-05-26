import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { buildOurGroceriesCsv } from "@/lib/integrations/ourgroceries/export";
import { loadExportItemsForList } from "@/lib/integrations/ourgroceries/service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const list = await prisma.shoppingList.findUnique({ where: { id } });
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const items = await loadExportItemsForList(id);
  const csv = buildOurGroceriesCsv(items);

  const filename = `einkaufsliste-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
