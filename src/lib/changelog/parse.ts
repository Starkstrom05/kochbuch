export type ReleaseSection = {
  /** "Neu", "Geändert", "Behoben", "Entfernt" — beliebig viele möglich. */
  title: string;
  /** Markdown-Body der Listenpunkte, je Eintrag eine Zeile (ohne führendes "- "). */
  items: string[];
};

export type Release = {
  /** Reine Versionsnummer ohne `v`-Prefix, z.B. "0.19.1". */
  version: string;
  /** ISO-Datum YYYY-MM-DD oder null (z.B. "[Unreleased]"). */
  date: string | null;
  sections: ReleaseSection[];
};

const VERSION_HEADING = /^##\s+\[([^\]]+)\](?:\s+[—–-]\s+(\d{4}-\d{2}-\d{2}))?/;
const SECTION_HEADING = /^###\s+(.+?)\s*$/;
const LIST_ITEM = /^[-*]\s+(.*)$/;

/**
 * Parsed eine Keep-a-Changelog-Datei in eine Liste von Releases. Tolerant:
 * unbekannte Sections-Titel werden durchgereicht, Fortsetzungen einer
 * Listzeile (indented) werden an den letzten Item angehängt.
 */
export function parseChangelog(raw: string): Release[] {
  const lines = raw.split(/\r?\n/);
  const releases: Release[] = [];
  let current: Release | null = null;
  let currentSection: ReleaseSection | null = null;

  for (const line of lines) {
    const versionMatch = VERSION_HEADING.exec(line);
    if (versionMatch) {
      flushSection(current, currentSection);
      currentSection = null;
      current = {
        version: stripVPrefix(versionMatch[1]),
        date: versionMatch[2] ?? null,
        sections: [],
      };
      releases.push(current);
      continue;
    }

    if (!current) continue;

    const sectionMatch = SECTION_HEADING.exec(line);
    if (sectionMatch) {
      flushSection(current, currentSection);
      currentSection = { title: sectionMatch[1].trim(), items: [] };
      continue;
    }

    if (!currentSection) continue;

    const itemMatch = LIST_ITEM.exec(line);
    if (itemMatch) {
      currentSection.items.push(itemMatch[1].trim());
      continue;
    }

    // Fortsetzung der vorherigen Listenzeile (eingerückt mit Leerzeichen).
    if (line.startsWith("  ") && currentSection.items.length > 0) {
      const idx = currentSection.items.length - 1;
      currentSection.items[idx] = `${currentSection.items[idx]} ${line.trim()}`;
    }
  }

  flushSection(current, currentSection);
  return releases;
}

function flushSection(release: Release | null, section: ReleaseSection | null) {
  if (!release || !section) return;
  if (section.items.length === 0) return;
  release.sections.push(section);
}

function stripVPrefix(raw: string): string {
  return raw.replace(/^v/i, "");
}

/**
 * Liefert alle Releases, die "neuer" als `since` sind (basierend auf SemVer).
 * `since` ist die zuletzt-vom-User-gesehene Version (oder null = alle).
 * Releases ohne Datum (z.B. "Unreleased") werden ausgeschlossen.
 */
export function releasesNewerThan(releases: Release[], since: string | null): Release[] {
  const dated = releases.filter((r) => r.date !== null);
  if (!since) return dated;
  return dated.filter((r) => compareSemver(r.version, since) > 0);
}

/**
 * Vergleicht zwei SemVer-Strings (ohne Pre-Release-Suffix). >0 wenn a > b.
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map((n) => Number.parseInt(n, 10));
  const pb = b.split(".").map((n) => Number.parseInt(n, 10));
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}
