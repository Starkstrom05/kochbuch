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

/** Branding der Familie des eingeloggten Nutzers (für per-Familie-Theme/Name). */
export async function getFamilyBranding(): Promise<FamilyBranding | null> {
  try {
    const session = await auth();
    const familyId = session?.user?.familyId;
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
