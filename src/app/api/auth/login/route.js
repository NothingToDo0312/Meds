import { route, readJson, HttpError } from "@/lib/server/errors";
import { User } from "@/lib/server/models";
import {
  DUMMY_HASH, assertNotThrottled, clearFails, publicUser, recordFail, startSession, throttleKey, verifyPassword,
} from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!email || !password) throw new HttpError(400, "Enter your email and password.");

  const key = throttleKey(req, email);
  assertNotThrottled(key);

  const user = await User.findByEmail(email);
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    recordFail(key);
    throw new HttpError(401, "Incorrect email or password.");
  }

  clearFails(key);
  await startSession(req, user.id, !!body.remember);
  return Response.json({ user: publicUser(user) });
});
