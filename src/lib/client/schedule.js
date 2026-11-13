import { dayAgo, dayKeyOf, toMin, nowMin, weekdayOf } from "./time";

// log: { "YYYY-MM-DD": { "<medId>@<HH:MM>": "taken" | "skipped" } }
export const slotKey = (medId, slot) => `${medId}@${slot}`;

// Immutable update of one log entry (status null clears it).
export function withStatus(log, date, key, status) {
  const day = { ...(log[date] || {}) };
  if (status) day[key] = status;
  else delete day[key];
  return { ...log, [date]: day };
}

// Every scheduled dose for the day `daysBack` days ago (0 = today) in `tz`, sorted by time.
export function slotsFor(meds, log, tz, daysBack = 0) {
  const { key, weekday } = dayAgo(tz, daysBack);
  const slots = [];
  for (const med of meds) {
    if (!med.days.includes(weekday)) continue;
    for (const slot of med.times) {
      slots.push({ med, slot, date: key, status: log[key]?.[slotKey(med.id, slot)] ?? null });
    }
  }
  return slots.sort((a, b) => a.slot.localeCompare(b.slot) || a.med.name.localeCompare(b.med.name));
}

const isPast = (daysBack, slot, tz) => daysBack > 0 || toMin(slot) <= nowMin(tz);

// Last 7 days (oldest first) for one medicine: "ok" | "miss" | "none".
export function weekDots(log, med, tz) {
  const dots = [];
  for (let i = 6; i >= 0; i--) {
    const { key, weekday } = dayAgo(tz, i);
    const due = med.days.includes(weekday) ? med.times.filter((t) => isPast(i, t, tz)) : [];
    const taken = due.filter((t) => log[key]?.[slotKey(med.id, t)] === "taken");
    dots.push(!due.length ? "none" : taken.length === due.length ? "ok" : "miss");
  }
  return dots;
}

// Share of doses taken among those that were due in the last 7 days.
export function weekAdherence(meds, log, tz) {
  let due = 0, taken = 0;
  for (let i = 0; i < 7; i++) {
    for (const s of slotsFor(meds, log, tz, i)) {
      if (!isPast(i, s.slot, tz)) continue;
      due++;
      if (s.status === "taken") taken++;
    }
  }
  return { due, taken };
}


// ---- Calendar helpers -------------------------------------------------------

// Every scheduled dose on one calendar day (key = "YYYY-MM-DD"). A medicine only counts from the day it was added.
export function slotsOn(meds, log, key, tz) {
  const weekday = weekdayOf(key);
  const slots = [];
  for (const med of meds) {
    if (!med.days.includes(weekday)) continue;
    if (med.created_at && key < dayKeyOf(med.created_at, tz)) continue;
    for (const slot of med.times) slots.push({ med, slot, date: key, status: log[key]?.[slotKey(med.id, slot)] ?? null });
  }
  return slots.sort((a, b) => a.slot.localeCompare(b.slot) || a.med.name.localeCompare(b.med.name));
}

// taken | skipped | missed (time has passed, nothing logged) | upcoming
export function slotState(s, todayKey, now) {
  if (s.status) return s.status;
  return s.date < todayKey || (s.date === todayKey && toMin(s.slot) <= now) ? "missed" : "upcoming";
}

export function summarize(slots, todayKey, now) {
  const states = slots.map((s) => slotState(s, todayKey, now));
  const count = (k) => states.filter((x) => x === k).length;
  return { total: slots.length, states, taken: count("taken"), skipped: count("skipped"), missed: count("missed"), upcoming: count("upcoming") };
}

// One word for how a whole day went: none | future | full | partial | missed | skipped | pending
export function dayTone(sum, key, todayKey) {
  if (!sum.total) return "none";
  if (key > todayKey) return "future";
  if (sum.taken === sum.total) return "full";
  if (sum.taken === 0 && sum.upcoming > 0 && !sum.missed && !sum.skipped) return "pending";
  if (sum.taken === 0 && !sum.upcoming) return sum.missed ? "missed" : "skipped";
  return "partial";
}
