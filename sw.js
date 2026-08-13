/* PIBO — minimal service worker.
   Just enough for the site to qualify as an installable PWA on
   Android/Chrome. Caches nothing aggressively so the site always
   shows the latest menu/prices from data/store.json. */
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // pass-through — always go to the network so prices/menu stay live
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
