import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import { canAccessShoppingList } from "@/lib/shopping/permissions";
import { actorFromSession } from "@/lib/auth/helpers";

/**
 * Leichter Versionsstempel für das Live-Update-Polling: liefert nur
 * ShoppingList.updatedAt als Millis. Der Client refresht die Seite nur, wenn
 * sich der Stempel erhöht hat — viel günstiger als ein periodischer
 * router.refresh(), der die ganze RSC-Page neu rendern würde.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!(await canAccessShoppingList(actorFromSession(session), id))) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const list = await prisma.shoppingList.findUnique({
    where: { id },
    select: { updatedAt: true },
  });
  if (!list) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(
    { v: list.updatedAt.getTime() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
