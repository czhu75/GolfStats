/* Golf Stats — service worker
   Bump CACHE_NAME on every deploy (keep it in sync with APP_VERSION).
   Strategy: cache-first for same-origin GETs, background refresh for pages,
   network fallback to the cached shell so the app opens with no signal. */

var CACHE_NAME = 'golfstats-1.0.0';
var CORE = ['./', './index.html', './manifest.json',
  './icon-192.png', './icon-180.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      /* add one by one so a single 404 cannot fail the whole install */
      return Promise.all(CORE.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE_NAME ? null : caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

function refreshShell(cache, request) {
  return fetch(request).then(function (res) {
    if (res && res.ok) {
      cache.put('./index.html', res.clone()).catch(function () {});
    }
    return res;
  }).catch(function () { return null; });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (!req || req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) {
          if (req.mode === 'navigate') e.waitUntil(refreshShell(cache, req));
          return hit;
        }
        return fetch(req).then(function (res) {
          if (res && res.ok && res.type === 'basic') {
            cache.put(req, res.clone()).catch(function () {});
          }
          return res;
        }).catch(function () {
          if (req.mode === 'navigate') {
            return cache.match('./index.html').then(function (shell) {
              return shell || new Response('Offline', {
                status: 503,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
              });
            });
          }
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      });
    })
  );
});

self.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
