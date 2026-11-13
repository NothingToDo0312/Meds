// Browser notifications for due doses. Everything here is per-device and runs in the browser.
const PREFS_KEY = "mr_notify_prefs";
const CHANGE = "mr:notify-change";

export const supported = () => typeof window !== "undefined" && "Notification" in window;
// "default" (not asked yet) | "granted" | "denied" | "unsupported"
export const permission = () => (supported() ? Notification.permission : "unsupported");

const DEFAULTS = { enabled: true, sound: true };
export function readPrefs() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; } catch { return { ...DEFAULTS }; }
}
export function writePrefs(next) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify({ ...readPrefs(), ...next })); } catch { /* storage unavailable */ }
  window.dispatchEvent(new Event(CHANGE));
}
export const onChange = (fn) => { window.addEventListener(CHANGE, fn); return () => window.removeEventListener(CHANGE, fn); };

// Reminders are shown only when the browser allows them AND the person hasn't switched them off here.
export const isActive = () => permission() === "granted" && readPrefs().enabled;

// ---- service worker (needed for notification buttons, and for notifications to work on Android)
let workerReady;
export function registerWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  workerReady ||= navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready).catch(() => null);
  return workerReady;
}

export async function showNotification({ title, body, tag, data }) {
  if (!isActive()) return false;
  const options = {
    body, tag, data, renotify: Boolean(tag), icon: "/icon-192.png", badge: "/badge-96.png",
    actions: data?.medId ? [{ action: "taken", title: "Taken" }, { action: "skip", title: "Skip" }] : undefined,
  };
  try {
    const reg = await registerWorker();
    if (reg) { await reg.showNotification(title, options); return true; }
  } catch { /* fall through to the plain API */ }
  try {
    const { actions, ...plain } = options; // eslint-disable-line no-unused-vars
    new Notification(title, plain);
    return true;
  } catch { return false; }
}

// ---- sound (browsers only allow audio after the person has interacted with the page)
let audio;
export function unlockAudio() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch { /* no audio available */ }
}
export function chime() {
  if (!readPrefs().sound || !audio || audio.state !== "running") return;
  try {
    [[880, 0], [1175, 0.2]].forEach(([freq, at]) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      const t = audio.currentTime + at;
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch { /* ignore */ }
}

// Ask the browser for permission (call from a click). Returns the resulting permission.
export async function enable() {
  if (!supported()) return "unsupported";
  unlockAudio();
  let result;
  try { result = await Notification.requestPermission(); } catch { result = permission(); }
  if (result === "granted") { writePrefs({ enabled: true }); registerWorker(); } else window.dispatchEvent(new Event(CHANGE));
  return result;
}

export async function sendTest() {
  unlockAudio();
  chime();
  return showNotification({ title: "Notifications are on", body: "You'll get a reminder like this when a dose is due.", tag: "mr-test" });
}
