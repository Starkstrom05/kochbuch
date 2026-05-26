import { describe, expect, it } from "vitest";
import { compareSemver, parseChangelog, releasesNewerThan } from "./parse";

describe("parseChangelog", () => {
  it("parses a typical Keep-a-Changelog block", () => {
    const raw = `# Changelog

## [0.19.0] — 2026-05-26

### Neu
- Feature A
- Feature B
  mit Fortsetzung

### Behoben
- Bugfix X
`;
    const releases = parseChangelog(raw);
    expect(releases).toHaveLength(1);
    expect(releases[0]).toMatchObject({
      version: "0.19.0",
      date: "2026-05-26",
    });
    expect(releases[0].sections).toHaveLength(2);
    expect(releases[0].sections[0]).toEqual({
      title: "Neu",
      items: ["Feature A", "Feature B mit Fortsetzung"],
    });
    expect(releases[0].sections[1].items).toEqual(["Bugfix X"]);
  });

  it("parses multiple releases in order", () => {
    const raw = `## [0.19.1] — 2026-05-26
### Behoben
- Fix one

## [0.19.0] — 2026-05-26
### Neu
- Big feature
`;
    const r = parseChangelog(raw);
    expect(r.map((x) => x.version)).toEqual(["0.19.1", "0.19.0"]);
  });

  it("handles [Unreleased] with no date", () => {
    const raw = `## [Unreleased]

## [0.1.0] — 2026-01-01
### Neu
- Initial
`;
    const r = parseChangelog(raw);
    expect(r[0].version).toBe("Unreleased");
    expect(r[0].date).toBeNull();
    expect(r[1].date).toBe("2026-01-01");
  });

  it("skips empty sections", () => {
    const raw = `## [1.0.0] — 2026-01-01
### Neu

### Behoben
- A bug
`;
    const r = parseChangelog(raw);
    expect(r[0].sections.map((s) => s.title)).toEqual(["Behoben"]);
  });

  it("strips v prefix from version", () => {
    const raw = `## [v0.5.0] — 2026-01-01
### Neu
- Item
`;
    expect(parseChangelog(raw)[0].version).toBe("0.5.0");
  });

  it("tolerates the dash-only date separator (–, -, —)", () => {
    const variants = ["—", "–", "-"];
    for (const sep of variants) {
      const raw = `## [1.2.3] ${sep} 2026-03-04\n### Neu\n- Item\n`;
      expect(parseChangelog(raw)[0].date).toBe("2026-03-04");
    }
  });
});

describe("releasesNewerThan", () => {
  const releases = parseChangelog(`## [Unreleased]
### Neu
- WIP

## [0.19.1] — 2026-05-26
### Behoben
- Fix

## [0.19.0] — 2026-05-26
### Neu
- Big

## [0.18.0] — 2026-05-25
### Geändert
- Tweak
`);

  it("returns all dated releases when since is null", () => {
    expect(releasesNewerThan(releases, null).map((r) => r.version)).toEqual([
      "0.19.1",
      "0.19.0",
      "0.18.0",
    ]);
  });

  it("excludes Unreleased entries", () => {
    const out = releasesNewerThan(releases, null);
    expect(out.some((r) => r.version === "Unreleased")).toBe(false);
  });

  it("only returns versions strictly newer than since", () => {
    expect(releasesNewerThan(releases, "0.18.0").map((r) => r.version)).toEqual([
      "0.19.1",
      "0.19.0",
    ]);
    expect(releasesNewerThan(releases, "0.19.1").map((r) => r.version)).toEqual([]);
  });
});

describe("compareSemver", () => {
  it("returns negative when a < b", () => {
    expect(compareSemver("0.18.0", "0.19.0")).toBeLessThan(0);
    expect(compareSemver("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareSemver("0.19.0", "0.19.1")).toBeLessThan(0);
  });

  it("returns 0 for equal versions", () => {
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns positive when a > b", () => {
    expect(compareSemver("0.20.0", "0.19.5")).toBeGreaterThan(0);
  });
});
