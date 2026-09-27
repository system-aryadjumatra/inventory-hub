/* AJ Inventory Hub - Service Worker v2 */
const CACHE = 'ajihub-v2';
const CORE_ASSETS = ['./', './index.html', './sw.js'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CORE_ASSETS).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // API Google Apps Script → biarkan lewat jaringan (jangan di-cache)
  if (url.hostname.includes('script.google.com') ||
      url.hostname.includes('googleusercontent.com')) {
    return;
  }

  // Non-GET → biarkan
  if (req.method !== 'GET') return;

  // HTML navigation → network-first, fallback cache
  if (req.mode === 'navigate' ||
      (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || caches.match('./index.html'))
      )
    );
    return;
  }

  // CDN & asset lain → cache-first, network-fallback
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Cache resource dari domain sendiri + CDN umum
        if (res.ok && (url.origin === location.origin ||
            url.hostname.includes('cdn.tailwindcss.com') ||
            url.hostname.includes('cdnjs.cloudflare.com') ||
            url.hostname.includes('cdn.jsdelivr.net') ||
            url.hostname.includes('fonts.googleapis.com') ||
            url.hostname.includes('fonts.gstatic.com'))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
