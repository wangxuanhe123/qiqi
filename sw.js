// Service Worker for 七七 · AI伴侣
const CACHE_NAME = 'qiqi-v10';   // 跟 index.html 的 APP_VERSION 同一个号，部署时一起改
const ASSETS_TO_CACHE = [
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
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first with timeout fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests for our own origin
  if (event.request.method !== 'GET') return;

  // Don't cache API calls
  if (event.request.url.includes('api.deepseek.com')) return;

  event.respondWith(networkFirstWithTimeout(event.request));
});

function networkFirstWithTimeout(request) {
  return new Promise((resolve) => {
    let settled = false;

    // 网络超过 3 秒没响应 → 切本地缓存，避免一直卡启动页
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolveFromCache(request).then(resolve);
    }, 3000);

    fetch(request, { cache: 'reload' })
      .then((response) => {
        // 先刷新缓存，再判断要不要用这个响应 —— 顺序很重要。
        // 如果已经超时、上面用旧缓存兜过底了（手机网络慢时天天发生），这次晚到的响应至少能把缓存更新掉，
        // 于是"下一次打开"就是新的。以前这里先 return 再 put，晚到的响应被直接丢掉，旧页面会一直留着。
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(response);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolveFromCache(request).then(resolve);
      });
  });
}

function resolveFromCache(request) {
  return caches.match(request).then((cached) => {
    return cached || new Response(
      '<html><head><meta charset="utf-8"></head><body style="text-align:center;padding-top:40vh;font-family:sans-serif;background:#fce4ec;">' +
      '<h1>💕</h1><p>七七暂时连不上网络...</p><p>请检查网络后重试</p></body></html>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  });
}
