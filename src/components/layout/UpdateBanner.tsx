import { prisma } from "@/lib/db/prisma";
import packageJson from "../../../package.json";

type VersionData = { current: string; latest: string; hasUpdate: boolean };

async function getVersionData(): Promise<VersionData> {
  const current = packageJson.version;

  const cached = await prisma.appMeta.findUnique({ where: { key: "latestVersion" } }).catch(() => null);
  const checkedAt = await prisma.appMeta.findUnique({ where: { key: "latestVersionCheckedAt" } }).catch(() => null);

  const TTL = 24 * 60 * 60 * 1000;
  if (cached?.value && checkedAt?.value && Date.now() - Number(checkedAt.value) < TTL) {
    const latest = cached.value;
    const hasUpdate = compareVersions(latest, current) > 0;
    return { current, latest, hasUpdate };
  }

  return { current, latest: current, hasUpdate: false };
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export async function UpdateBanner() {
  const { current, latest, hasUpdate } = await getVersionData();
  if (!hasUpdate) return null;

  return (
    <div className="bg-paper-200 px-4 py-2 text-center font-written text-sm text-ink ring-1 ring-paper-300">
      🆕 Version{" "}
      <strong className="font-semibold">{latest}</strong>{" "}
      ist verfügbar (aktuell: {current}).{" "}
      <a
        href="https://github.com/Starkstrom05/kochbuch/releases/latest"
        target="_blank"
        rel="noreferrer"
        className="text-ribbon underline underline-offset-2"
      >
        Update-Anleitung →
      </a>
    </div>
  );
}
