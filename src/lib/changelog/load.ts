import fs from "node:fs";
import path from "node:path";
import { parseChangelog, releasesNewerThan, type Release } from "./parse";

let cached: Release[] | null = null;

/**
 * Liest und parsed CHANGELOG.md einmal pro Prozess-Lebenszeit.
 *
 * In Dev liegt die Datei im Repo-Root (`process.cwd()`); im standalone-
 * Docker-Build wird sie via `outputFileTracingIncludes` in `next.config.ts`
 * ins Image gezogen und liegt unter `/app/CHANGELOG.md`.
 *
 * Gibt bei Lese-Fehler ein leeres Array zurück — die Hauptfunktionalität
 * der App soll davon nicht abhängen.
 */
export function loadChangelog(): Release[] {
  if (cached) return cached;
  try {
    const file = path.resolve(process.cwd(), "CHANGELOG.md");
    const raw = fs.readFileSync(file, "utf8");
    cached = parseChangelog(raw);
  } catch {
    cached = [];
  }
  return cached;
}

export function getReleasesSince(version: string | null): Release[] {
  return releasesNewerThan(loadChangelog(), version);
}
