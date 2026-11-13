import { route, readJson } from "@/lib/server/errors";
import { Link, User } from "@/lib/server/models";
import { publicUser, startSession } from "@/lib/server/auth";
import { createAccount } from "@/lib/server/accounts";
import { HttpError } from "@/lib/server/errors";
import {
  validateName, validateEmail, validatePassword, validateRole, timezoneOrUtc, normalizeInviteCode,
} from "@/lib/server/validators";

export const dynamic = "force-dynamic";

// Public sign-up for patients and guardians. The very first account becomes the admin.
export const POST = route(async (req) => {
  const body = await readJson(req);
  const name = validateName(body.name);
  const email = validateEmail(body.email);
  const password = validatePassword(body.password);

  const first = !(await User.anyExists());
  if (!first && process.env.ALLOW_SIGNUP === "false")
    throw new HttpError(403, "Sign-up is closed. Ask an admin to create your account.");

  const role = first ? "admin" : validateRole(body.role);

  let patient = null;
  const code = normalizeInviteCode(body.inviteCode);
  if (role === "guardian" && code) {
    patient = await User.findByInviteCode(code);
    if (!patient || patient.role !== "patient") throw new HttpError(400, "Invite code not found.");
  }

  const user = await createAccount({ name, email, password, role, timezone: timezoneOrUtc(body.timezone) });
  if (patient) await Link.create(patient.id, user.id);

  await startSession(req, user.id, !!body.remember);
  return Response.json({ user: publicUser(user) }, { status: 201 });
});
