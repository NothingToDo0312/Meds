import { Medicine } from "@/lib/server/models";
import { route, readJson } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { resolvePatientId } from "@/lib/server/access";
import { validateMedicine } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser();
  const patientId = await resolvePatientId(user, new URL(req.url).searchParams.get("patientId"));
  return Response.json(await Medicine.findForPatient(patientId));
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = await readJson(req);
  const patientId = await resolvePatientId(user, body.patientId);
  return Response.json(await Medicine.create(patientId, validateMedicine(body)), { status: 201 });
});
