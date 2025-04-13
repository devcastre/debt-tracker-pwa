const CACHE_NAME = "debt-tracker-cache-v1";
const urlsToCache = [
  "/",
  "index.html",
  "styles.css",
  "js file/script.js",
  "js file/dataBase.js",
  "manifest.json",
  "image/default-profile-picture1.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// Install Service Worker
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        urlsToCache.map(url =>
          cache.add(url).catch(err => {
            console.warn(`⚠️ Failed to cache: ${url}`, err);
          })
        )
      );
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
