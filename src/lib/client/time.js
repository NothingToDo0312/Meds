// All "today" logic runs in the viewed patient's timezone, so a guardian in
// another country sees the patient's day, not their own.
export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const deviceTimezone = () => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
};

export function safeTz(tz) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return tz; } catch { return deviceTimezone(); }
}

const formatters = new Map();
function parts(tz) {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    });
    formatters.set(tz, f);
  }
  const get = (t) => Number(f.formatToParts(new Date()).find((p) => p.type === t).value);
  return { y: get("year"), m: get("month"), d: get("day"), min: get("hour") * 60 + get("minute") };
}

// The calendar day `n` days before today in `tz`: { key: "YYYY-MM-DD", weekday: 0-6 }.
export function dayAgo(tz, n = 0) {
  const { y, m, d } = parts(tz);
  const date = new Date(Date.UTC(y, m - 1, d - n));
  return { key: date.toISOString().slice(0, 10), weekday: date.getUTCDay() };
}

export const dateKey = (tz, n = 0) => dayAgo(tz, n).key;

export const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const nowMin = (tz) => parts(tz).min;

export function fmtTime(t) {
  const [h, m] = t.split(":");
  const hour = Number(h);
  return `${hour % 12 || 12}:${m} ${hour < 12 ? "AM" : "PM"}`;
}

export function fmtDays(days) {
  if (days.length === 7) return "Every day";
  return days.map((d) => DAY_NAMES[d]).join(", ");
}

export function todayLabel(tz) {
  return new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: tz });
}

// Calendar day (YYYY-MM-DD) of an ISO timestamp, in `tz`.
export function dayKeyOf(iso, tz) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch { return "1970-01-01"; }
}

// First day of last month in `tz`: how far back the app loads dose history (enough for this month and the previous one).
export function historyStart(tz) {
  const [y, m] = dateKey(tz).split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
}

export const weekdayOf = (key) => new Date(`${key}T00:00:00Z`).getUTCDay();

export const longDate = (key) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
