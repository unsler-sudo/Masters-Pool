// public/sw.js — Tuna Golf Pool notifications worker (FINGERPRINT_V271_PUSH)
// Only shows push notifications and opens the pool when one is tapped. It deliberately has NO fetch
// handler and caches nothing, so it can never interfere with how the site loads.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'Tuna Golf Pool', {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || undefined,          // same tag replaces an older notice instead of stacking
    data: { url: d.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        if ('navigate' in w) { try { await w.navigate(url); } catch {} }
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  })());
});
