// Shows ticket alerts: the ones the server pushes, which arrive with the page closed or the phone
// locked, and the ones a page asks for on phones, where it cannot show a notification by itself.
// Nothing is cached and no request is intercepted.

// A new version takes over at once, so a push never lands on a worker that cannot show it.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("push", (event) => {
  // A push must always show something, or the browser withdraws the right to push.
  let alert = {};

  try {
    alert = event.data?.json() ?? {};
  } catch {
    // Not one of ours. The fallback below still shows.
  }

  const { body = "", kind = "near", ticket = "", title = "香港壽司郎籌號" } = alert;

  event.waitUntil(
    self.registration.getNotifications().then((shown) => {
      // A newer alert takes the place of the ticket's older one, and sounds again.
      for (const notification of shown) {
        if (notification.tag.startsWith(`ticket-${ticket}-`)) {
          notification.close();
        }
      }

      return self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        tag: `ticket-${ticket}-${kind}`,
      });
    }),
  );
});

// Tapping an alert brings My tickets to the front.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).pathname === "/tickets");
      return open ? open.focus() : self.clients.openWindow("/tickets");
    }),
  );
});
