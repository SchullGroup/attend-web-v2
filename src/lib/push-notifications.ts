// Item K — Web Push subscription helper.
// Registers the service worker in /public/sw.js, subscribes via the browser's
// Push API, and persists the subscription to the backend as a DeviceToken.

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  // Placeholder — must be replaced by the real key at build time.
  "";

export type PushState =
  | { supported: false; reason: string }
  | { supported: true; permission: NotificationPermission; subscribed: boolean };

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return { supported: false, reason: "SSR" };
  if (!("serviceWorker" in navigator)) return { supported: false, reason: "no-service-worker" };
  if (!("PushManager" in window)) return { supported: false, reason: "no-push-manager" };
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return {
    supported: true,
    permission: Notification.permission,
    subscribed: !!sub,
  };
}

export async function ensurePushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (!VAPID_PUBLIC_KEY) {
    console.warn("[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set; cannot subscribe.");
    return null;
  }
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
  });
  await sendSubscriptionToBackend(sub);
  return sub;
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === "undefined") return;
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  try {
    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
  } catch (_e) {
    // best-effort — the subscription is removed locally regardless.
  }
  await sub.unsubscribe();
}

async function sendSubscriptionToBackend(sub: PushSubscription) {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      platform: "WEB",
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }),
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
