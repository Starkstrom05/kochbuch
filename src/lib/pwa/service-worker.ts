// Baut die Service-Worker-Quelle mit einer an die App-Version gekoppelten
// Cache-Version. Grund: `/sw.js` war frueher eine statische Datei mit fest
// verdrahtetem `CACHE_VER` — bei jedem Deploy byte-identisch. Dadurch erkannte
// der Browser nie einen neuen SW, der `activate`-Cleanup lief nie, und alte
// Caches (inkl. altem Client-Bundle mit veralteten Server-Action-IDs) blieben
// ewig liegen. Auf der iOS-Homescreen-PWA fuehrte das nach einem Deploy zu
// "Page not found" beim Speichern (POST an eine Action-ID, die der neue Server
// nicht mehr kennt). Version im Cache-Namen => jeder Release invalidiert.

/** Praefix aller Kochbuch-Caches; der `activate`-Cleanup loescht alles mit
 *  diesem Praefix, das nicht zur aktuellen Version gehoert. */
export const CACHE_PREFIX = "kochbuch-";

export function cacheVersion(appVersion: string): string {
  return `${CACHE_PREFIX}v${appVersion}`;
}

export function buildServiceWorkerSource(appVersion: string): string {
  const CACHE_VER = cacheVersion(appVersion);
  return `// Service Worker — Kochbuch PWA (generiert, Version an App-Version gekoppelt)
const CACHE_VER = ${JSON.stringify(CACHE_VER)};
const CACHE_PREFIX = ${JSON.stringify(CACHE_PREFIX)};
const STATIC_CACHE = CACHE_VER + "-static";
const PAGE_CACHE = CACHE_VER + "-pages";
const IMAGE_CACHE = CACHE_VER + "-images";

const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.add(OFFLINE_URL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith(CACHE_PREFIX) && !k.startsWith(CACHE_VER))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/import") ||
    url.pathname.startsWith("/api/health")
  )
    return;

  // Content-gehashte Assets: cache-first (alte Versionen raeumt der activate-Cleanup weg).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }
  if (url.pathname.startsWith("/api/images/")) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.startsWith("/apple-touch")
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Seiten/RSC: network-first. Online (LAN-Normalfall) immer der aktuelle Build
  // => Server-Action-IDs passen immer. Offline => Cache, dann Offline-Fallback.
  event.respondWith(pageHandler(event.request));
});

function isCacheable(response) {
  return response && response.ok && !response.redirected && response.type !== "opaqueredirect";
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

async function pageHandler(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const network = await fetch(request);
    if (isCacheable(network)) cache.put(request, network.clone());
    return network;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    return Response.error();
  }
}
`;
}
