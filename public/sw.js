// Service Worker — Kochbuch PWA
// Manual caching without Workbox (Turbopack-compatible)

const CACHE_VER = "kochbuch-v2";
const STATIC_CACHE = `${CACHE_VER}-static`;
const PAGE_CACHE = `${CACHE_VER}-pages`;
const IMAGE_CACHE = `${CACHE_VER}-images`;

// ── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
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

  // Pages — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(event.request, PAGE_CACHE));
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

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached ?? fetchPromise;
}
