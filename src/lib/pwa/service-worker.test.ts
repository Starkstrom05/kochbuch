import { describe, it, expect } from "vitest";
import { buildServiceWorkerSource, cacheVersion, CACHE_PREFIX } from "./service-worker";

describe("cacheVersion", () => {
  it("koppelt den Cache-Namen an die App-Version", () => {
    expect(cacheVersion("0.33.3")).toBe("kochbuch-v0.33.3");
  });

  it("aendert sich mit jeder Version (sonst kein Cache-Invalidieren beim Deploy)", () => {
    expect(cacheVersion("0.33.3")).not.toBe(cacheVersion("0.33.4"));
  });
});

describe("buildServiceWorkerSource", () => {
  it("bettet die versionierte Cache-Version ein", () => {
    const src = buildServiceWorkerSource("1.2.3");
    expect(src).toContain('const CACHE_VER = "kochbuch-v1.2.3"');
  });

  it("raeumt beim activate alle Kochbuch-Caches ausser der aktuellen Version weg", () => {
    const src = buildServiceWorkerSource("1.2.3");
    // Cleanup filtert per Praefix + schliesst die aktuelle Version aus.
    expect(src).toContain("k.startsWith(CACHE_PREFIX) && !k.startsWith(CACHE_VER)");
    expect(src).toContain(`const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)}`);
  });

  it("nutzt network-first fuer Seiten (kein stale-serving von altem Client-Bundle)", () => {
    const src = buildServiceWorkerSource("1.2.3");
    // network-first: erst fetch, Cache nur im catch-Zweig als Fallback.
    const pageHandler = src.slice(src.indexOf("async function pageHandler"));
    const tryIdx = pageHandler.indexOf("const network = await fetch(request)");
    const fallbackIdx = pageHandler.indexOf("await cache.match(request)");
    expect(tryIdx).toBeGreaterThan(-1);
    expect(fallbackIdx).toBeGreaterThan(tryIdx);
  });

  it("behaelt cache-first fuer content-gehashte Assets", () => {
    const src = buildServiceWorkerSource("1.2.3");
    expect(src).toContain("cacheFirst(event.request, STATIC_CACHE)");
    expect(src).toContain("cacheFirst(event.request, IMAGE_CACHE)");
  });
});
