"use strict";
const SCOPE = self.registration.scope;
const CACHE = 'compasso-' + encodeURIComponent(SCOPE) + '-1.0.1';
const OLD_PREFIX = 'nekoquest-' + encodeURIComponent(SCOPE) + '-';
const PREFIX = 'compasso-' + encodeURIComponent(SCOPE) + '-';
const ASSETS = ['./', './index.html', './manifest.json?v=compasso-1.0.1', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS.map(url => new Request(new URL(url, SCOPE), {cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (key !== CACHE && (key.startsWith(PREFIX) || key.startsWith(OLD_PREFIX))) await caches.delete(key);
  }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(SCOPE)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        await cache.put(request, response.clone());
        if (request.mode === 'navigate') await cache.put(new URL('./index.html', SCOPE), response.clone());
      }
      return response;
    } catch {
      return (await cache.match(request)) || (request.mode === 'navigate' ? await cache.match(new URL('./index.html', SCOPE)) : null) || Response.error();
    }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const page = ['focus','tasks','workouts'].includes(event.notification.data?.page) ? event.notification.data.page : 'tasks';
    const windows = await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const client = windows.find(window => window.url.startsWith(SCOPE));
    if (client) { await client.focus(); client.postMessage({type:'nekoquest-notification',page}); }
    else await self.clients.openWindow(new URL('./?notice='+page,SCOPE).href);
  })());
});
