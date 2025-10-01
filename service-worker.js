self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("cornhole-cache-v1").then((cache) => {
      return cache.addAll([
        "./",
        "./index.html",
        "./app.js",
        "./manifest.json",
        "./icons/icon-192.png",
        "./icons/icon-512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return resp || fetch(event.request);
    })
  );
});