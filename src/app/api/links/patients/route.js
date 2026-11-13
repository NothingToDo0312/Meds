import { route, readJson } from "@/lib/server/errors";
import { Link, User } from "@/lib/server/models";
import { requireRole } from "@/lib/server/auth";
import { createAccount } from "@/lib/server/accounts";
import { validateName, validateEmail, validatePassword, timezoneOrUtc } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

// A guardian creates a patient account and is linked to it straight away.
// The guardian hands the email and password to the patient, who can change the password after signing in.
export const POST = route(async (req) => {
  const guardian = await requireRole("guardian");
  const body = await readJson(req);

  const patient = await createAccount({
    name: validateName(body.name),
    email: validateEmail(body.email),
    password: validatePassword(body.password),
    role: "patient",
    timezone: body.timezone ? timezoneOrUtc(body.timezone) : guardian.timezone,
  });

  try {
    await Link.create(patient.id, guardian.id);
  } catch (err) {
    await User.remove(patient.id).catch(() => {}); // don't leave an unlinked account behind
    throw err;
  }

  return Response.json(
    { patient: { id: patient.id, name: patient.name, email: patient.email, timezone: patient.timezone } },
    { status: 201 }
  );
});
