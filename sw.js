// Service Worker for 七七 · AI伴侣
const CACHE_NAME = 'qiqi-v34';   // 跟 index.html 的 APP_VERSION 同一个号，部署时一起改
// 只清理七七自己的旧缓存。缓存是"按站点"共享的，七七和七七B 在同一个域名下，
// 以前这里删掉"除我以外的一切"，谁更新一次就把对方的缓存也清了。
const CACHE_PREFIX = 'qiqi-v';
const ASSETS_TO_CACHE = [
  './',            // 导航地址本身（/qiqi/），不缓存它的话第一次打开还得走网络
  './index.html',
  './manifest.json'
];

// Install: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Silently continue if some assets can't be cached
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first (instant open), refresh in background
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // API 调用和别的站点一概不接管
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api.') || req.url.includes('api.deepseek.com')) return;

  event.respondWith(cacheFirst(req));
});

// 本地有缓存就立刻返回，同时后台悄悄更新，下次打开就是新版。
// 以前是"网络优先 + 3 秒超时"，每次打开都要先等一次网络往返，
// 手机上就是打开后干等一会儿才出来；B 那边数据是空的，所以感觉快得多。
function cacheFirst(request) {
  return caches.match(request, { ignoreSearch: true }).then((cached) => {
    const network = fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, clone))
            .catch(() => {});
        }
        return response;
      })
      .catch(() => null);

    if (cached) return cached;                       // 有缓存：先给页面，网络在后台跑
    return network.then((response) => response || offlinePage());
  });
}

function offlinePage() {
  return new Response(
    '<html><head><meta charset="utf-8"></head><body style="text-align:center;padding-top:40vh;font-family:sans-serif;background:#fce4ec;">' +
    '<h1>💕</h1><p>七七暂时连不上网络...</p><p>请检查网络后重试</p></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
