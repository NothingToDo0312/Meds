import { Dose, Medicine } from "@/lib/server/models";
import { route, readJson } from "@/lib/server/errors";
import { HttpError } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { loadMedicineFor, resolvePatientId } from "@/lib/server/access";
import { validateDose, validateFrom } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

export const GET = route(async (req) => {
  const user = await requireUser();
  const q = new URL(req.url).searchParams;
  const patientId = await resolvePatientId(user, q.get("patientId"));
  const meds = await Medicine.findForPatient(patientId);
  return Response.json(await Dose.findSince(meds.map((m) => m.id), validateFrom(q.get("from"))));
});

export const PUT = route(async (req) => {
  const user = await requireUser();
  const dose = validateDose(await readJson(req));
  const med = await loadMedicineFor(user, dose.medicineId);
  if (!med.times.includes(dose.slot)) throw new HttpError(400, "That time isn't scheduled.");

  await Dose.set(dose);
  return Response.json({ status: dose.status });
});
