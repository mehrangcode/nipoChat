import { useCallback, useEffect, useState } from 'react';
import { pushApi } from '../api';

/**
 * Web Push subscription management — written defensively for cross-browser quirks:
 *  - Feature-detect serviceWorker + PushManager + Notification (Safari < 16.4, iOS
 *    non-installed PWAs, and some in-app browsers lack these).
 *  - Only call Notification.requestPermission() from a user gesture (the Settings button).
 *  - Convert the VAPID key from base64url → Uint8Array (required by pushManager.subscribe).
 *  - Reuse an existing subscription if present; otherwise create one.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  // Explicit ArrayBuffer backing so the type is Uint8Array<ArrayBuffer> (not SharedArrayBuffer).
  const buffer = new ArrayBuffer(raw.length);
  const output = new Uint8Array(buffer);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  busy: boolean;
  error: string | null;
  /** iOS requires the PWA to be installed to home screen before push works. */
  needsInstall: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

export function usePush(): PushStatus {
  const supported =
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const needsInstall = isIos && !isStandalone();

  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    supported ? Notification.permission : 'unsupported'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => undefined);
  }, [supported]);

  const enable = useCallback(async () => {
    if (!supported) {
      setError('مرورگر شما از نوتیفیکیشن پشتیبانی نمی‌کند.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('اجازه‌ی نمایش نوتیفیکیشن داده نشد.');
        return;
      }

      const { publicKey, enabled } = await pushApi.vapidPublicKey();
      if (!enabled || !publicKey) {
        setError('سرور برای ارسال نوتیفیکیشن پیکربندی نشده است (VAPID).');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true, // required by Chrome
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      await pushApi.subscribe(sub.toJSON());
      setSubscribed(true);
    } catch (err) {
      setError((err as Error).message ?? 'خطا در فعال‌سازی نوتیفیکیشن.');
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const disable = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushApi.unsubscribe(sub.endpoint).catch(() => undefined);
        await sub.unsubscribe().catch(() => undefined);
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [supported]);

  return { supported, permission, subscribed, busy, error, needsInstall, enable, disable };
}
