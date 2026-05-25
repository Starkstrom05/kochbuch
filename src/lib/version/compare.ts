import { z } from "zod";

/**
 * Vergleicht zwei SemVer-Strings ("x.y.z"). Gibt >0 zurueck wenn a neuer ist,
 * <0 wenn a aelter, 0 bei Gleichheit. Ein fuehrendes "v" wird toleriert,
 * fehlende Segmente zaehlen als 0 ("1.2" == "1.2.0").
 */
export function compareVersions(a: string, b: string): number {
  const pa = normalize(a);
  const pb = normalize(b);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** True, wenn `latest` echt neuer als `current` ist. */
export function hasNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0;
}

function normalize(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(".")
    .map((p) => {
      const n = Number.parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
}

export const versionResponseSchema = z.object({
  current: z.string(),
  latest: z.string(),
  hasUpdate: z.boolean(),
});

export type VersionResponse = z.infer<typeof versionResponseSchema>;
