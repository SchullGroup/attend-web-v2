// Attend service worker — Item K (Web Push notifications).
// Registered by src/lib/push-notifications.ts on user opt-in.

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: "Attend", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Attend";
  const opts = {
    body: data.body || "",
    icon: data.icon || "/attend-logo.png",
    badge: data.badge || "/attend-logo.png",
    data: data.data || {},
    tag: data.tag,
  };
  event.waitUntil(self.registration.showNotification(title, opts));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.deepLink) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.focus();
          if ("navigate" in w) w.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
