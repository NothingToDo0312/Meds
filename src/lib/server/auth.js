import { cookies } from "next/headers";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { HttpError } from "./errors";
import { Session, User } from "./models";

const scryptAsync = promisify(scrypt);
const COOKIE = "mr_session";
const HOUR = 3600_000;
const TTL = { remember: 30 * 24 * HOUR, short: 12 * HOUR };
const TOUCH_EVERY = 5 * 60_000;

// ---- passwords (scrypt, per-password salt) ----------------------------------
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored).split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await scryptAsync(password, Buffer.from(salt, "base64"), expected.length);
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Compared against when the email is unknown, so timing doesn't reveal which emails exist.
export const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;

// ---- sessions ---------------------------------------------------------------
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

const isHttps = (req) =>
  (req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "")) === "https";

export async function startSession(req, userId, remember) {
  const token = randomBytes(32).toString("base64url");
  const ttl = remember ? TTL.remember : TTL.short;
  await Session.create({
    user_id: userId,
    token_hash: sha256(token),
    remember: !!remember,
    expires_at: new Date(Date.now() + ttl).toISOString(),
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps(req),
    ...(remember ? { maxAge: Math.floor(ttl / 1000) } : {}), // no maxAge = browser-session cookie
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    const s = await Session.findByHash(sha256(token));
    if (s) await Session.removeById(s.id);
  }
  jar.delete(COOKIE);
}

// Returns { user, session } for the signed-in caller, or null.
export async function currentSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  const session = await Session.findByHash(sha256(token));
  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) {
    await Session.removeById(session.id);
    return null;
  }
  const user = await User.findById(session.user_id);
  if (!user) return null;

  if (Date.now() - new Date(session.last_used_at).getTime() > TOUCH_EVERY) await Session.touch(session.id);
  return { user, session };
}

export async function requireUser() {
  const s = await currentSession();
  if (!s) throw new HttpError(401, "Please sign in.");
  return s.user;
}

export async function requireRole(...roles) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new HttpError(403, "You don't have permission to do that.");
  return user;
}

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  timezone: u.timezone,
  invite_code: u.role === "patient" ? u.invite_code : null,
  created_at: u.created_at,
});

// ---- login throttling (in memory: per server instance) ----------------------
const fails = new Map();
const WINDOW = 15 * 60_000;
const MAX_FAILS = 8;

export function throttleKey(req, email) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  return `${ip}|${email}`;
}
export function assertNotThrottled(key) {
  const f = fails.get(key);
  if (f && Date.now() - f.first < WINDOW && f.count >= MAX_FAILS)
    throw new HttpError(429, "Too many attempts. Try again in a few minutes.");
}
export function recordFail(key) {
  const f = fails.get(key);
  if (!f || Date.now() - f.first >= WINDOW) fails.set(key, { first: Date.now(), count: 1 });
  else f.count++;
}
export const clearFails = (key) => fails.delete(key);
