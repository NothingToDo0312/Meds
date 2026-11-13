import { HttpError } from "./errors";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUSES = ["taken", "skipped"];

export const ROLES = ["admin", "patient", "guardian"];

export function validateMedicine(body = {}) {
  const name = String(body.name ?? "").trim();
  if (!name || name.length > 40) throw new HttpError(400, "Name is required (max 40 characters).");

  const dose = String(body.dose ?? "").trim() || "1 tablet";
  if (dose.length > 30) throw new HttpError(400, "Dose is too long (max 30 characters).");

  const times = [...new Set(Array.isArray(body.times) ? body.times : [])].sort();
  if (!times.length || times.length > 12 || !times.every((t) => TIME.test(t)))
    throw new HttpError(400, "Add 1 to 12 reminder times (HH:MM).");

  const rawDays = Array.isArray(body.days) ? body.days : [0, 1, 2, 3, 4, 5, 6];
  const days = [...new Set(rawDays.map(Number))].sort();
  if (!days.length || !days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))
    throw new HttpError(400, "Pick at least one day.");

  const notes = String(body.notes ?? "").trim().slice(0, 200);
  return { name, dose, times, days, notes };
}

export function validateId(raw, what = "id") {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `Invalid ${what}.`);
  return id;
}

// status === null clears the log (undo).
export function validateDose(body = {}) {
  const medicineId = Number(body.medicineId);
  if (!Number.isInteger(medicineId) || medicineId < 1) throw new HttpError(400, "medicineId is required.");
  if (!DATE.test(body.date || "")) throw new HttpError(400, "date must be YYYY-MM-DD.");
  if (!TIME.test(body.slot || "")) throw new HttpError(400, "slot must be HH:MM.");

  const status = body.status ?? null;
  if (status !== null && !STATUSES.includes(status))
    throw new HttpError(400, "status must be taken, skipped or null.");

  return { medicineId, date: body.date, slot: body.slot, status };
}

export const validateFrom = (from) => (DATE.test(from || "") ? from : "1970-01-01");

// ---- accounts ---------------------------------------------------------------

export function validateName(raw) {
  const name = String(raw ?? "").trim();
  if (!name || name.length > 60) throw new HttpError(400, "Name is required (max 60 characters).");
  return name;
}

export function validateEmail(raw) {
  const email = String(raw ?? "").trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 254) throw new HttpError(400, "Enter a valid email address.");
  return email;
}

export function validatePassword(raw) {
  const pw = String(raw ?? "");
  if (pw.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
  if (pw.length > 128) throw new HttpError(400, "Password is too long (max 128 characters).");
  return pw;
}

export function validateRole(raw, { allowAdmin = false } = {}) {
  const roles = allowAdmin ? ROLES : ["patient", "guardian"];
  if (!roles.includes(raw)) throw new HttpError(400, `Role must be ${roles.join(", ")}.`);
  return raw;
}

export function validateTimezone(raw) {
  const tz = String(raw ?? "").trim();
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    throw new HttpError(400, "Unknown timezone.");
  }
}

// Timezone from the browser at sign-up; fall back to UTC rather than rejecting.
export function timezoneOrUtc(raw) {
  try { return validateTimezone(raw); } catch { return "UTC"; }
}

export const normalizeInviteCode = (raw) => String(raw ?? "").trim().toUpperCase().replace(/\s+/g, "");
