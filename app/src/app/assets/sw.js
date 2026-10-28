/* Lumu — service worker : démarrage hors ligne + cache des images */
const V = "lumu-v91";
const IMG = "lumu-img-v1";
const AUDIO = "lumu-audio-v1";
const SHELL = ["/", "/manifest.json", "/icon-192.png", "/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== IMG && k !== AUDIO).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function reseauPuisCache(req, nom, repli) {
  try {
    const r = await fetch(req);
    if (r && r.ok) { const c = await caches.open(nom); c.put(repli || req, r.clone()); }
    return r;
  } catch (err) {
    const c = await caches.match(repli || req);
    if (c) return c;
    throw err;
  }
}
async function cacheEtRevalide(req, nom, max) {
  const c = await caches.open(nom);
  const vieux = await c.match(req);
  const maj = fetch(req).then(async r => {
    if (r && (r.ok || r.type === "opaque")) {
      await c.put(req, r.clone());
      if (max) { const ks = await c.keys(); if (ks.length > max) for (const k of ks.slice(0, ks.length - max)) await c.delete(k); }
    }
    return r;
  }).catch(() => vieux);
  return vieux || maj;
}

async function servirAudio(req) {
  const c = await caches.open(AUDIO);
  const r = await c.match(req.url);
  if (!r) return fetch(req);
  const blob = await r.blob(), type = r.headers.get("content-type") || blob.type || "audio/mpeg";
  const rg = req.headers.get("range");
  if (!rg) return new Response(blob, { status: 200, headers: { "content-type": type, "content-length": String(blob.size), "accept-ranges": "bytes" } });
  const m = /bytes=(\d*)-(\d*)/.exec(rg) || [];
  const s = m[1] ? +m[1] : 0, e = Math.min(m[2] ? +m[2] : blob.size - 1, blob.size - 1);
  return new Response(blob.slice(s, e + 1), { status: 206, headers: { "content-type": type, "content-range": `bytes ${s}-${e}/${blob.size}`, "content-length": String(e - s + 1), "accept-ranges": "bytes" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method === "GET" && /\/storage\/v1\/object\/public\/.+\.(mp3|m4a|aac|ogg|opus|wav|weba)$/i.test(req.url)) {
    e.respondWith(caches.open(AUDIO).then(c => c.match(req.url)).then(h => h ? servirAudio(req) : fetch(req)));
    return;
  }
  if (req.method !== "GET" || req.headers.has("range")) return;
  const u = new URL(req.url);
  if (u.pathname.startsWith("/.netlify/") || u.pathname.startsWith("/c/")) return;
  if (req.mode === "navigate" && u.origin === location.origin) {
    e.respondWith(reseauPuisCache(req, V, "/"));
    return;
  }
  if (u.hostname === "cdn.jsdelivr.net") { e.respondWith(cacheEtRevalide(req, V)); return; }
  if (u.origin === location.origin) { e.respondWith(cacheEtRevalide(req, V)); return; }
  if (u.pathname.includes("/storage/v1/object/public/") && /\.(jpe?g|png|webp|avif|gif)$/i.test(u.pathname)) {
    e.respondWith(cacheEtRevalide(req, IMG, 150));
  }
});

self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) {}
  e.waitUntil(self.registration.showNotification(d.title || "🌅 Ta lumière du jour t'attend", {
    body: d.body || "", icon: "/icon-192.png", badge: "/favicon-32.png", tag: d.tag || "lumu-jour", renotify: true, data: { url: d.url || "/" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const u = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
    for (const c of l) if ("focus" in c && "navigate" in c) return c.focus().then(w => (w || c).navigate(u).catch(() => w));
    return clients.openWindow(u);
  }));
});
