/**
 * Helpa CRM & AI Receptionist — Service Worker
 * Handles PWA offline shell lifecycle and real-time push notifications.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    const title = payload.title || 'Helpa CRM Alert';
    const options = {
      body: payload.body || 'New customer activity requiring attention.',
      icon: payload.icon || '/favicon.png',
      badge: '/favicon-32x32.png',
      tag: payload.tag || 'helpa-alert',
      renotify: true,
      data: {
        url: payload.url || '/inbox',
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Helpa CRM Alert', {
        body: text,
        icon: '/favicon.png',
        badge: '/favicon-32x32.png',
        data: { url: '/inbox' },
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || '/inbox';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
