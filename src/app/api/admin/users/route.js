import { route, readJson } from "@/lib/server/errors";
import { User } from "@/lib/server/models";
import { publicUser, requireRole } from "@/lib/server/auth";
import { createAccount } from "@/lib/server/accounts";
import {
  validateName, validateEmail, validatePassword, validateRole, timezoneOrUtc,
} from "@/lib/server/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireRole("admin");
  return Response.json((await User.list()).map(publicUser));
});

// Admins create accounts of any role (including more admins).
export const POST = route(async (req) => {
  await requireRole("admin");
  const body = await readJson(req);
  const user = await createAccount({
    name: validateName(body.name),
    email: validateEmail(body.email),
    password: validatePassword(body.password),
    role: validateRole(body.role, { allowAdmin: true }),
    timezone: timezoneOrUtc(body.timezone),
  });
  return Response.json(publicUser(user), { status: 201 });
});
