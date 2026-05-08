// Minimal Service Worker for PWA
const CACHE_NAME = 'repair-desk-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network first strategy or simple pass-through
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
