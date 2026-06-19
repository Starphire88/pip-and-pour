// Minimal service worker for PWA installability.
// Caching and push notifications will be added in a later step.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
