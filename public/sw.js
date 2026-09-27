// Pip & Pour service worker.
// Purpose: make the app installable and keep it opening when the network is slow or absent.
// Navigations are network-first (always fresh when online); hashed build assets are cache-first.
// Supabase and other cross-origin calls are never cached.

const VERSION = "pip-pour-v1";
const SHELL = "/";
const PRECACHE = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json" ||
    /\.(css|js|mjs|png|jpg|jpeg|svg|webp|woff2?|ico)$/.test(url.pathname)
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(SHELL, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await cache.match(SHELL));
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(request);
  if (cached) {
    // Refresh in the background; the cached copy is served immediately.
    fetch(request)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
      })
      .catch(() => {});
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirstAsset(request));
  }
});
