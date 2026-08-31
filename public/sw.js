self.addEventListener("push", function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || "New notification",
        icon: data.icon || "/favicon.ico",
        badge: data.badge || "/favicon.ico",
        data: {
          url: data.url || "/",
        },
      };
      event.waitUntil(
        self.registration.showNotification(data.title || "Attend", options)
      );
    } catch (e) {
      // Fallback text if data is not JSON
      const text = event.data.text();
      event.waitUntil(
        self.registration.showNotification("Attend Notification", {
          body: text,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
        })
      );
    }
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
