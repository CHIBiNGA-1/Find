/* f!nd Service Worker — v1
 * Strategy:
 *   Navigation  → network-first, offline fallback to /offline.html
 *   _next/static → cache-first (content-hashed, safe to cache forever)
 *   Everything else → network-only (never cache auth, Supabase API, private data)
 *
 * Supabase paths (/rest/v1/, /auth/v1/, /storage/v1/, /realtime/) are
 * explicitly network-only so session tokens and private row data are never
 * written to the cache store.
 */

const SHELL_CACHE = "campushive-shell-v1";
const STATIC_CACHE = "campushive-static-v1";

const SHELL_URLS = ["/offline.html"];

const NEVER_CACHE = [
  "/rest/v1/",
  "/auth/v1/",
  "/storage/v1/",
  "/realtime/",
  "supabase.co",
];

// ── Install: pre-cache the offline shell ─────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ── Activate: delete stale caches ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = [SHELL_CACHE, STATIC_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never intercept non-GET requests (POST/PUT/DELETE = mutations)
  if (request.method !== "GET") return;

  // 2. Never cache Supabase or any external auth/API call
  if (NEVER_CACHE.some((p) => request.url.includes(p))) return;

  // 3. _next/static — immutable, content-hashed → cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 4. Navigation (page loads) → network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 5. Everything else (images served from _next/image, etc.) → network-only
});

// ── Strategies ────────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return offline ?? new Response("Offline", { status: 503 });
  }
}

// ── Push notifications (skeleton for future use) ──────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const { title = "f!nd", body = "", url: link = "/" } = event.data.json();
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: link },
      }),
    );
  } catch {
    // malformed push payload — ignore
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(clients.openWindow(url));
});
