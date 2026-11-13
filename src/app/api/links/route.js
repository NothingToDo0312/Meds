import { route, readJson, HttpError, UNIQUE_VIOLATION } from "@/lib/server/errors";
import { Link, User } from "@/lib/server/models";
import { requireUser, requireRole } from "@/lib/server/auth";
import { normalizeInviteCode } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

const brief = (u) => ({ id: u.id, name: u.name, email: u.email, timezone: u.timezone });

// Who can I look after (patients) and who looks after me (guardians)?
export const GET = route(async () => {
  const user = await requireUser();

  if (user.role === "patient") {
    const links = await Link.forPatient(user.id);
    const guardians = await User.findByIds(links.map((l) => l.guardian_id));
    return Response.json({
      patients: [brief(user)],
      guardians: links
        .map((l) => ({ linkId: l.id, ...brief(guardians.find((g) => g.id === l.guardian_id) ?? {}) }))
        .filter((g) => g.id),
    });
  }

  if (user.role === "guardian") {
    const links = await Link.forGuardian(user.id);
    const patients = await User.findByIds(links.map((l) => l.patient_id));
    return Response.json({
      patients: links
        .map((l) => ({ linkId: l.id, ...brief(patients.find((p) => p.id === l.patient_id) ?? {}) }))
        .filter((p) => p.id),
      guardians: [],
    });
  }

  return Response.json({ patients: (await User.listByRole("patient")).map(brief), guardians: [] });
});

// A guardian links to a patient with the patient's invite code.
export const POST = route(async (req) => {
  const user = await requireRole("guardian");
  const code = normalizeInviteCode((await readJson(req)).inviteCode);
  if (!code) throw new HttpError(400, "Enter the patient's invite code.");

  const patient = await User.findByInviteCode(code);
  if (!patient || patient.role !== "patient") throw new HttpError(404, "Invite code not found.");

  try {
    await Link.create(patient.id, user.id);
  } catch (err) {
    if (err.code !== UNIQUE_VIOLATION) throw err; // already linked: fine
  }
  return Response.json({ patient: brief(patient) }, { status: 201 });
});
