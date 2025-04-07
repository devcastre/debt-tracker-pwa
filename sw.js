const CACHE_NAME = "debt-tracker-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/js file/script.js",
  "/js file/db.js",
  "/manifest.json",
  "/image/default-profile-picture1.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Install Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch Resources
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
