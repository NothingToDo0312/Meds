import { Medicine } from "@/lib/server/models";
import { HttpError, route, readJson } from "@/lib/server/errors";
import { requireUser } from "@/lib/server/auth";
import { assertCanAccess, loadMedicineFor } from "@/lib/server/access";
import { validateMedicine, validateId } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

export const PUT = route(async (req, { params }) => {
  const user = await requireUser();
  const id = validateId((await params).id, "medicine id");
  await loadMedicineFor(user, id);
  const med = await Medicine.update(id, validateMedicine(await readJson(req)));
  if (!med) throw new HttpError(404, "Medicine not found.");
  return Response.json(med);
});

export const DELETE = route(async (req, { params }) => {
  const user = await requireUser();
  const id = validateId((await params).id, "medicine id");
  const med = await Medicine.findById(id);
  if (med) {
    if (med.patient_id == null) throw new HttpError(404, "Medicine not found.");
    await assertCanAccess(user, med.patient_id);
    await Medicine.remove(id);
  }
  return new Response(null, { status: 204 });
});
