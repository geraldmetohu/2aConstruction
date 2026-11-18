// Site check-in app: keeps the page and its files on the phone so it opens even with no signal.
// Photos taken offline are kept by the page itself (IndexedDB) and sent when the signal is back.
const CACHE = "2a-crew-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  // App files never change once built: cache first.
  if (url.pathname.startsWith("/_next/static/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(caches.open(CACHE).then(async c => (await c.match(req)) || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }
  // The check-in page: always try the network (fresh times), fall back to the last copy when offline.
  if (req.mode === "navigate" && url.pathname.startsWith("/crew/")) {
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; })
      .catch(async () => (await caches.match(req)) || new Response("<h1 style='font-family:sans-serif'>No signal</h1><p style='font-family:sans-serif'>Open this again when you have signal.</p>", { headers: { "Content-Type": "text/html" } })));
  }
});
