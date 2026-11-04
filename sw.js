const CACHE_NAME = 'pk-practice-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ইনস্টল ইভেন্ট: প্রয়োজনীয় ফাইল ক্যাশে সংরক্ষণ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// অ্যাক্টিভেশন ইভেন্ট: পুরনো ক্যাশ মুছে ফেলা
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ফেচ ইভেন্ট: ক্যাশ থেকে ফাইল দ্রুত লোড করা
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // অফলাইনে কোনো রিকোয়েস্ট ফেইল করলে ক্যাশের মেইন পেজ দেখাবে
        return caches.match('./index.html');
      });
    })
  );
});
