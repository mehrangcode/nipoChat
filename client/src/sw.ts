/// <reference lib="webworker" />
/**
 * Custom service worker (injectManifest strategy).
 * Responsibilities:
 *   1. Precache the app shell so the app opens offline.
 *   2. Runtime-cache GET API responses (NetworkFirst) for offline reading.
 *   3. Handle Web Push `push` + `notificationclick` events.
 *
 * Push-notification care (cross-browser):
 *   - `push` handler MUST call event.waitUntil(showNotification(...)) or Chrome
 *     shows a generic "site updated in background" notification.
 *   - Payload is JSON we send from the server ({ title, body, tag, data.url }).
 *   - `notificationclick` focuses an existing client or opens a new one.
 */
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope;

// __WB_MANIFEST is injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

// Cache API GETs so conversations/messages are readable offline.
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
  })
);

// Cache uploaded media for offline viewing.
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new NetworkFirst({ cacheName: 'media-cache' })
);

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: { url?: string; [k: string]: unknown };
}

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { title: 'Nipo Chat', body: event.data?.text() ?? 'پیام جدید' };
  }

  const title = payload.title ?? 'Nipo Chat';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: payload.badge ?? '/icons/icon-192.png',
    tag: payload.tag,
    data: payload.data ?? {},
    dir: 'rtl',
    lang: 'fa',
  };

  // Must waitUntil, or the notification may not display.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Focus an existing tab if one is open, else open a new one.
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try {
              await (client as WindowClient).navigate(targetUrl);
            } catch {
              /* navigation may fail cross-origin; ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
