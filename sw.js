/* PIBO — minimal service worker.
   Just enough for the site to qualify as an installable PWA on
   Android/Chrome. Caches nothing aggressively so the site always
   shows the latest menu/prices from data/store.json.

   Heavy / cross-origin requests (3D models on R2, CDN scripts, Range
   requests) are NOT routed through the worker: proxying a 10MB+ GLB
   through respondWith() adds latency and memory pressure on Android. */
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;           // R2 / CDN: let the browser handle it
  if (req.headers.has("range")) return;                       // streamed / partial downloads
  if (/\.(glb|gltf|usdz|mp4|webm)$/i.test(url.pathname)) return; // big 3D / media files

  // pass-through — always go to the network so prices/menu stay live
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});
