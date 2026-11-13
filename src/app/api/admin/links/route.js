import { route, readJson, HttpError, UNIQUE_VIOLATION } from "@/lib/server/errors";
import { Link, User } from "@/lib/server/models";
import { requireRole } from "@/lib/server/auth";
import { validateId } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requireRole("admin");
  const links = await Link.all();
  const users = await User.findByIds([...new Set(links.flatMap((l) => [l.patient_id, l.guardian_id]))]);
  const name = (id) => users.find((u) => u.id === id)?.name ?? "(deleted)";
  return Response.json(
    links.map((l) => ({ id: l.id, patientId: l.patient_id, guardianId: l.guardian_id,
      patientName: name(l.patient_id), guardianName: name(l.guardian_id) }))
  );
});

export const POST = route(async (req) => {
  await requireRole("admin");
  const body = await readJson(req);
  const patient = await User.findById(validateId(body.patientId, "patientId"));
  const guardian = await User.findById(validateId(body.guardianId, "guardianId"));
  if (!patient || patient.role !== "patient") throw new HttpError(400, "Pick a patient.");
  if (!guardian || guardian.role !== "guardian") throw new HttpError(400, "Pick a guardian.");
  try {
    await Link.create(patient.id, guardian.id);
  } catch (err) {
    if (err.code !== UNIQUE_VIOLATION) throw err;
  }
  return new Response(null, { status: 204 });
});
