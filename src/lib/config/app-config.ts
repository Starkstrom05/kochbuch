import { prisma } from "@/lib/db/prisma";

const DEFAULT_APP_NAME = "Merys Kochbuch";

export async function getAppName(): Promise<string> {
  const meta = await prisma.appMeta.findUnique({ where: { key: "appName" } });
  return meta?.value ?? process.env.APP_NAME ?? DEFAULT_APP_NAME;
}
