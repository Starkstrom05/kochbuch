import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import {
  decryptSecret,
  isCredentialsKeyConfigured,
  unpackCredentials,
} from "@/lib/crypto/credentials";
import {
  OurGroceriesApiError,
  OurGroceriesAuthError,
  OurGroceriesClient,
} from "@/lib/integrations/ourgroceries/client";
import { loadExportItemsForList } from "@/lib/integrations/ourgroceries/service";
import { canAccessShoppingList } from "@/lib/shopping/permissions";
import { actorFromSession } from "@/lib/auth/helpers";

export const maxDuration = 60;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  }

  if (!isCredentialsKeyConfigured()) {
    return NextResponse.json(
      {
        error: "OurGroceries-Modul ist nicht konfiguriert (OURGROCERIES_ENCRYPTION_KEY fehlt).",
        fallback: "csv",
      },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  if (!(await canAccessShoppingList(actorFromSession(session), id))) {
    return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  }

  const creds = await prisma.userOurGroceriesCredentials.findUnique({
    where: { userId: session.user.id },
  });
  if (!creds || !creds.defaultListId) {
    return NextResponse.json(
      { error: "Bitte zuerst mit OurGroceries verbinden.", needsSetup: true },
      { status: 412 },
    );
  }

  const items = await loadExportItemsForList(id);
  if (items.length === 0) {
    return NextResponse.json({ added: 0, failed: 0 }, { status: 200 });
  }

  const client = new OurGroceriesClient();
  let ogSession;
  try {
    const plain = decryptSecret({
      ciphertext: Buffer.from(creds.encryptedSecret),
      iv: Buffer.from(creds.iv),
      authTag: Buffer.from(creds.authTag),
    });
    const { username, password } = unpackCredentials(plain);
    ogSession = await client.login(username, password);
  } catch (err) {
    const authErr = err instanceof OurGroceriesAuthError;
    return NextResponse.json(
      {
        error: authErr
          ? "OurGroceries-Login wurde abgelehnt — bitte Zugangsdaten erneuern."
          : `OurGroceries-Login fehlgeschlagen: ${(err as Error).message}`,
        fallback: "csv",
        needsSetup: authErr,
      },
      { status: authErr ? 412 : 502 },
    );
  }

  let result;
  try {
    result = await client.addItems(ogSession, creds.defaultListId, items);
  } catch (err) {
    if (err instanceof OurGroceriesAuthError) {
      return NextResponse.json(
        {
          error: "Session abgelaufen — bitte erneut verbinden.",
          fallback: "csv",
          needsSetup: true,
        },
        { status: 412 },
      );
    }
    return NextResponse.json(
      {
        error:
          err instanceof OurGroceriesApiError
            ? `OurGroceries-API-Fehler: ${err.message}`
            : `OurGroceries nicht erreichbar: ${(err as Error).message}`,
        fallback: "csv",
      },
      { status: 502 },
    );
  }

  await prisma.userOurGroceriesCredentials.update({
    where: { userId: session.user.id },
    data: { lastSyncAt: new Date() },
  });

  return NextResponse.json(
    {
      added: result.added,
      failed: result.failed.length,
      listName: creds.defaultListName,
    },
    { status: 200 },
  );
}
