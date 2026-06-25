/* eslint-disable no-restricted-globals */
/**
 * 🚀 NOVA Service Worker — Edge Asset Delivery
 *
 * Caches gift assets (Lottie/MP4/PNG), avatars, frames, and other static media
 * with a stale-while-revalidate strategy for instant load from local cache.
 *
 * Strategy by request type:
 *  - Lottie/MP4/Image assets   → Cache First (immutable URLs from Supabase storage)
 *  - Supabase storage public/  → SWR (cache, refresh in background)
 *  - HTML/JS/CSS app shell     → Network First (fall back to cache when offline)
 *  - API/Realtime/Auth         → Bypass (always live)
 */

const VERSION = "nova-cache-v2-room-layout";
const ASSET_CACHE = `${VERSION}-assets`;
const SHELL_CACHE = `${VERSION}-shell`;

const ASSET_EXT = /\.(png|jpg|jpeg|webp|gif|svg|json|lottie|mp4|webm|mp3|ogg|woff2?|ttf)$/i;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

const isAsset = (url) => {
  // Supabase storage public objects, image hosts, or any media extension
  if (ASSET_EXT.test(url.pathname)) return true;
  if (url.pathname.includes("/storage/v1/object/public/")) return true;
  return false;
};

const isBypass = (url) => {
  // Never cache realtime, auth, RPC, edge functions
  if (url.pathname.includes("/realtime/")) return true;
  if (url.pathname.includes("/auth/")) return true;
  if (url.pathname.includes("/rest/")) return true;
  if (url.pathname.includes("/functions/")) return true;
  if (url.protocol === "ws:" || url.protocol === "wss:") return true;
  return false;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  if (isBypass(url)) return;

  // 🎁 Asset cache-first (instant load from edge)
  if (isAsset(url)) {
    event.respondWith(cacheFirst(req, ASSET_CACHE));
    return;
  }

  // App shell — only same-origin navigations / scripts
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      event.respondWith(networkFirst(req, SHELL_CACHE));
      return;
    }
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    // Background revalidate (SWR) but don't block
    fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
      })
      .catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || Response.error();
  }
}
