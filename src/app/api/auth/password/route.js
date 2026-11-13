import { route, readJson, HttpError } from "@/lib/server/errors";
import { Session, User } from "@/lib/server/models";
import { currentSession, hashPassword, verifyPassword } from "@/lib/server/auth";
import { validatePassword } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

// Change own password. Every other signed-in device is signed out.
export const POST = route(async (req) => {
  const s = await currentSession();
  if (!s) throw new HttpError(401, "Please sign in.");

  const body = await readJson(req);
  if (!(await verifyPassword(String(body.current ?? ""), s.user.password_hash)))
    throw new HttpError(400, "Current password is incorrect.");

  const next = validatePassword(body.next);
  await User.update(s.user.id, { password_hash: await hashPassword(next) });
  await Session.removeForUser(s.user.id, s.session.id);
  return new Response(null, { status: 204 });
});
