/* MediReminder service worker: shows dose reminders and handles the Taken / Skip buttons on them. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  const note = event.notification;
  const d = note.data || {};
  note.close();

  // "taken" / "skip" come from the buttons; a plain tap just opens the app.
  const act = event.action === "taken" || event.action === "skip" ? event.action : null;
  const msg = act && d.medId ? { type: "dose-action", action: act, medId: d.medId, slot: d.slot, date: d.date, name: d.name } : null;

  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (wins.length) {
      const win = wins.find((w) => w.visibilityState === "visible") || wins[0];
      if (msg) win.postMessage(msg);
      else await win.focus();
      return;
    }
    // App isn't open: open it and let it apply the action once signed in and loaded.
    const url = msg
      ? `/?dose=${msg.action}&med=${encodeURIComponent(msg.medId)}&slot=${encodeURIComponent(msg.slot)}&date=${encodeURIComponent(msg.date)}`
      : "/";
    await self.clients.openWindow(url);
  })());
});
