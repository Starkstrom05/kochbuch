import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import packageJson from "../../../../package.json";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 h
const GITHUB_REPO = "Starkstrom05/kochbuch";

export async function GET() {
  const current = packageJson.version;

  try {
    const latest = await fetchLatestVersion();
    const hasUpdate = latest !== null && compareVersions(latest, current) > 0;
    return NextResponse.json({ current, latest: latest ?? current, hasUpdate });
  } catch {
    return NextResponse.json({ current, latest: current, hasUpdate: false });
  }
}

async function fetchLatestVersion(): Promise<string | null> {
  // Check cache in AppMeta
  const cached = await prisma.appMeta.findUnique({ where: { key: "latestVersion" } }).catch(() => null);
  const checkedAt = await prisma.appMeta.findUnique({ where: { key: "latestVersionCheckedAt" } }).catch(() => null);

  if (cached?.value && checkedAt?.value) {
    const age = Date.now() - Number(checkedAt.value);
    if (age < CACHE_TTL_MS) return cached.value;
  }

  // Fetch from GitHub Releases API
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
    {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "kochbuch-app" },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!res.ok) return cached?.value ?? null;

  const data = (await res.json()) as { tag_name?: string };
  const latest = data.tag_name?.replace(/^v/, "") ?? null;

  if (latest) {
    await prisma.$transaction([
      prisma.appMeta.upsert({ where: { key: "latestVersion" }, update: { value: latest }, create: { key: "latestVersion", value: latest } }),
      prisma.appMeta.upsert({ where: { key: "latestVersionCheckedAt" }, update: { value: String(Date.now()) }, create: { key: "latestVersionCheckedAt", value: String(Date.now()) } }),
    ]).catch(() => null);
  }

  return latest;
}

/** Returns positive if a > b, negative if a < b, 0 if equal. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
