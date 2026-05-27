import { prisma } from "@/lib/db/prisma";
import { hasNewerVersion, type VersionResponse } from "./compare";
import packageJson from "../../../package.json";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const GITHUB_REPO = "Starkstrom05/kochbuch";

/**
 * Ermittelt die aktuelle Version (aus package.json) + die jüngste GitHub-Release-
 * Version, mit Tagescache in `AppMeta`. Liefert immer ein vollstaendiges
 * Response-Objekt — bei Offline/GitHub-Fehler `hasUpdate: false` ohne Wurf.
 *
 * Wird sowohl von `/api/version/route.ts` (externer Konsument) als auch direkt
 * von der `UpdateBanner`-RSC genutzt, damit dort kein Client-fetch entsteht.
 */
export async function getVersionStatus(): Promise<VersionResponse> {
  const current = packageJson.version;
  try {
    const latest = await fetchLatestVersion();
    const hasUpdate = latest !== null && hasNewerVersion(latest, current);
    return { current, latest: latest ?? current, hasUpdate };
  } catch {
    return { current, latest: current, hasUpdate: false };
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  const cached = await prisma.appMeta
    .findUnique({ where: { key: "latestVersion" } })
    .catch(() => null);
  const checkedAt = await prisma.appMeta
    .findUnique({ where: { key: "latestVersionCheckedAt" } })
    .catch(() => null);

  if (cached?.value && checkedAt?.value) {
    const age = Date.now() - Number(checkedAt.value);
    if (age < CACHE_TTL_MS) return cached.value;
  }

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "kochbuch-app" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return cached?.value ?? null;

  const data = (await res.json()) as { tag_name?: string };
  const latest = data.tag_name?.replace(/^v/, "") ?? null;

  if (latest) {
    await prisma
      .$transaction([
        prisma.appMeta.upsert({
          where: { key: "latestVersion" },
          update: { value: latest },
          create: { key: "latestVersion", value: latest },
        }),
        prisma.appMeta.upsert({
          where: { key: "latestVersionCheckedAt" },
          update: { value: String(Date.now()) },
          create: { key: "latestVersionCheckedAt", value: String(Date.now()) },
        }),
      ])
      .catch(() => null);
  }

  return latest;
}
