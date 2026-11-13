import { route, readJson } from "@/lib/server/errors";
import { User } from "@/lib/server/models";
import { currentSession, publicUser, requireUser } from "@/lib/server/auth";
import { validateName, validateTimezone } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

// Who am I? 200 with user: null when signed out, plus whether the first-run admin setup is pending.
export const GET = route(async () => {
  const s = await currentSession();
  if (s) return Response.json({ user: publicUser(s.user) });
  return Response.json({
    user: null,
    setup: !(await User.anyExists()),
    signupOpen: process.env.ALLOW_SIGNUP !== "false",
  });
});

// Update own display name and/or timezone.
export const PATCH = route(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const patch = {};
  if (body.name !== undefined) patch.name = validateName(body.name);
  if (body.timezone !== undefined) patch.timezone = validateTimezone(body.timezone);
  const updated = Object.keys(patch).length ? await User.update(user.id, patch) : user;
  return Response.json({ user: publicUser(updated) });
});
