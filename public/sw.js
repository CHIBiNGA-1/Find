/* f!nd service worker v3
 *   Push              shows a content-free notification (who it is from, not what it says); click opens the conversation
 *   Navigation        network-first (with navigation preload), offline page if the network fails
 *   _next/static      cache-first (content-hashed)
 *   icons, hero image stale-while-revalidate (instant, refreshed in the background)
 *   Supabase + auth   never touched: tokens and private data are never written to a cache
 */
const SHELL_CACHE = "find-shell-v2";
const STATIC_CACHE = "find-static-v2";
const ASSET_CACHE = "find-assets-v2";
const SHELL_URLS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/hero.jpg"];
const NEVER_CACHE = ["/rest/v1/", "/auth/v1/", "/storage/v1/", "/realtime/", "supabase.co", "/auth/callback"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  const keep = [SHELL_CACHE, STATIC_CACHE, ASSET_CACHE];
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))),
      self.registration.navigationPreload?.enable(),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  if (NEVER_CACHE.some((p) => request.url.includes(p))) return;

  if (url.pathname.startsWith("/_next/static/")) { event.respondWith(cacheFirst(request, STATIC_CACHE)); return; }
  if (url.origin === location.origin && (url.pathname.startsWith("/icons/") || url.pathname === "/hero.jpg")) { event.respondWith(staleWhileRevalidate(request, ASSET_CACHE)); return; }
  if (request.mode === "navigate") { event.respondWith(navigate(event)); return; }
});

async function cacheFirst(request, name) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) (await caches.open(name)).put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  const fresh = fetch(request).then((res) => { if (res.ok) cache.put(request, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
}

async function navigate(event) {
  try {
    const preload = await event.preloadResponse;
    return preload || (await fetch(event.request));
  } catch {
    return (await caches.match("/offline.html")) || new Response("You are offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

self.addEventListener("message", (event) => { if (event.data === "SKIP_WAITING") self.skipWaiting(); });

self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const { title = "f!nd", body = "", url: link = "/" } = event.data.json();
    event.waitUntil(self.registration.showNotification(title, { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: link } }));
  } catch { /* malformed payload */ }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => "focus" in c);
      return open ? open.navigate(url).then((c) => c && c.focus()) : self.clients.openWindow(url);
    }),
  );
});

// ── Web Push ────────────────────────────────────────────────────────────────────────────────────────────────────
// The server sends { title, body, url, tag } and never message text. Same-origin paths only.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* malformed payload: fall back to a generic notice */ }
  const title = typeof data.title === "string" && data.title ? data.title.slice(0, 80) : "f!nd";
  const body = typeof data.body === "string" ? data.body.slice(0, 140) : "You have a new message";
  const url = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/messages";
  event.waitUntil((async () => {
    // If the app is open and visible the live inbox already shows it; don't buzz twice.
    const open = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (open.some((c) => c.visibilityState === "visible")) return;
    await self.registration.showNotification(title, { body, tag: typeof data.tag === "string" ? data.tag : "message", data: { url }, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const url = typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/messages";
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) { if ("focus" in w) { await w.focus(); if ("navigate" in w) { try { await w.navigate(url); } catch { /* cross-origin or detached: ignore */ } } return; } }
    await self.clients.openWindow(url);
  })());
});
