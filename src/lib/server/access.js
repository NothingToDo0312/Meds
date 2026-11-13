import { HttpError } from "./errors";
import { Link, Medicine, User } from "./models";
import { validateId } from "./validators";

// May `user` view and manage `patientId`'s medicines and dose history?
//   patient  -> only themselves
//   guardian -> patients who linked them
//   admin    -> every patient
export async function assertCanAccess(user, patientId) {
  if (user.role === "patient") {
    if (patientId !== user.id) throw new HttpError(403, "You don't have access to that patient.");
  } else if (user.role === "admin") {
    const p = await User.findById(patientId);
    if (!p || p.role !== "patient") throw new HttpError(404, "Patient not found.");
  } else if (user.role === "guardian") {
    if (!(await Link.find(patientId, user.id))) throw new HttpError(403, "You don't have access to that patient.");
  } else {
    throw new HttpError(403, "You don't have access to that patient.");
  }
}

// Which patient does this request act on? Patients: always themselves.
export async function resolvePatientId(user, raw) {
  if (user.role === "patient") {
    if (raw != null && raw !== "" && Number(raw) !== user.id)
      throw new HttpError(403, "You don't have access to that patient.");
    return user.id;
  }
  if (raw == null || raw === "") throw new HttpError(400, "patientId is required.");
  const id = validateId(raw, "patientId");
  await assertCanAccess(user, id);
  return id;
}

// Loads a medicine and checks the caller may touch it.
export async function loadMedicineFor(user, medicineId) {
  const med = await Medicine.findById(medicineId);
  if (!med || med.patient_id == null) throw new HttpError(404, "Medicine not found.");
  await assertCanAccess(user, med.patient_id);
  return med;
}
