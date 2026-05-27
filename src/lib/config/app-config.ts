import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth/auth";

const DEFAULT_APP_NAME = "Merys Kochbuch";

export async function getAppName(): Promise<string> {
  try {
    const meta = await prisma.appMeta.findUnique({ where: { key: "appName" } });
    return meta?.value ?? process.env.APP_NAME ?? DEFAULT_APP_NAME;
  } catch {
    return process.env.APP_NAME ?? DEFAULT_APP_NAME;
  }
}

export type FamilyBranding = {
  name: string;
  accentColor: string | null;
  inkColor: string | null;
  paperColor: string | null;
  coverImagePath: string | null;
};

/**
 * Aktives Theme-Branding fuer das App-Layout. Seit v0.22 liegt Branding
 * primaer am Cookbook (siehe `cookbook-actions.ts:updateCookbookBrandingAction`);
 * `Family` wird nur noch als Fallback fuer Alt-Daten genutzt, bei denen ein
 * Admin per `assignUserFamilyAction` `User.familyId` gesetzt hat.
 *
 * Priorisierung:
 *  1. Aktives Cookbook des Users (User.activeCookbookId)
 *  2. Eigene Familie (Family-Tabelle) — Alt-Pfad
 *  3. null → globaler Default
 *
 * Der Funktionsname bleibt aus Abwaerts-Kompatibilitaet (Layout + Manifest
 * nutzen ihn an mehreren Stellen).
 */
export async function getFamilyBranding(): Promise<FamilyBranding | null> {
  try {
    const session = await auth();
    if (!session?.user) return null;

    if (session.user.activeCookbookId) {
      const cb = await prisma.cookbook.findUnique({
        where: { id: session.user.activeCookbookId },
        select: {
          name: true,
          accentColor: true,
          inkColor: true,
          paperColor: true,
          coverImagePath: true,
        },
      });
      if (cb) return cb;
    }

    const familyId = session.user.familyId;
    if (!familyId) return null;
    return await prisma.family.findUnique({
      where: { id: familyId },
      select: {
        name: true,
        accentColor: true,
        inkColor: true,
        paperColor: true,
        coverImagePath: true,
      },
    });
  } catch {
    return null;
  }
}
