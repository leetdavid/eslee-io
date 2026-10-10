// Shows ticket alerts on phones, where a page cannot show a notification by itself. Tapping an
// alert brings My tickets to the front. Nothing is cached and no request is intercepted.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      const open = clients.find((client) => new URL(client.url).pathname === "/tickets");
      return open ? open.focus() : self.clients.openWindow("/tickets");
    }),
  );
});
