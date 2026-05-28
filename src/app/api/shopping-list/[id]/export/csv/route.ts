import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { buildOurGroceriesCsv } from "@/lib/integrations/ourgroceries/export";
import { loadExportItemsForList } from "@/lib/integrations/ourgroceries/service";
import { canAccessShoppingList } from "@/lib/shopping/permissions";
import { actorFromSession } from "@/lib/auth/helpers";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!(await canAccessShoppingList(actorFromSession(session), id))) {
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
