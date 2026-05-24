// Service Worker — Kochbuch PWA
// Manual caching without Workbox (Turbopack-compatible)

const CACHE_VER = "kochbuch-v3";
const STATIC_CACHE = `${CACHE_VER}-static`;
const PAGE_CACHE = `${CACHE_VER}-pages`;
const IMAGE_CACHE = `${CACHE_VER}-images`;

const OFFLINE_URL = "/offline";

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  // Precache the offline fallback page so failed navigations have something to
  // show. Best-effort: a failure here must not block activation.
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => {}),
  );
  // Kick in immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("kochbuch-") && !k.startsWith(CACHE_VER))
          .map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip cross-origin, API (except /api/images), and auth routes
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/api/import") ||
    url.pathname.startsWith("/api/health")
  )
    return;

  // /_next/static — immutable (content-hashed): cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Recipe images — cache-first, long TTL
  if (url.pathname.startsWith("/api/images/")) {
    event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
    return;
  }

  // Public icons, manifest — cache-first
  if (
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.startsWith("/apple-touch")
  ) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // Pages — stale-while-revalidate with offline fallback for navigations
  event.respondWith(pageHandler(event.request));
});

// ── Helpers ────────────────────────────────────────────────────────────────

function isCacheable(response) {
  // Don't cache redirects (e.g. 302 to /login from middleware) or
  // opaqueredirect responses — they'd leak authed pages to logged-out users.
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
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Stale-while-revalidate: serve cache instantly, refresh in the background.
  if (cached) return cached;

  const network = await fetchPromise;
  if (network) return network;

  // Offline with nothing cached → friendly fallback for full-page navigations.
  if (request.mode === "navigate") {
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
  }
  return Response.error();
}
