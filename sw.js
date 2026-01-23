// Service Worker (Kasir Offline) - cache version bump
const CACHE = "kasir-offline-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // hanya handle origin yang sama
  if (url.origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const fresh = await fetch(req);
        // cache file GET basic
        if (req.method === "GET" && fresh && fresh.status === 200) {
          cache.put(req, fresh.clone()).catch(() => {});
        }
        return fresh;
      } catch {
        // fallback ke cache root kalau offline
        const fallback = await cache.match("./");
        return fallback || new Response("Offline", { status: 503 });
      }
    })()
  );
});
