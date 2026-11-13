import { supabase } from "./supabase";
import { HttpError, unwrap, FOREIGN_KEY_VIOLATION } from "./errors";

const MED_COLS = "id, name, dose, times, days, notes, patient_id";
const USER_COLS = "id, name, email, password_hash, role, timezone, invite_code, created_at";

export const Medicine = {
  findForPatient: async (patientId) =>
    unwrap(await supabase().from("medicines").select(MED_COLS).eq("patient_id", patientId).order("name").order("id")),

  findById: async (id) => unwrap(await supabase().from("medicines").select(MED_COLS).eq("id", id).maybeSingle()),

  create: async (patientId, data) =>
    unwrap(await supabase().from("medicines").insert({ ...data, patient_id: patientId }).select(MED_COLS).single()),

  // Returns the updated row, or null if the id doesn't exist.
  update: async (id, data) =>
    unwrap(await supabase().from("medicines").update(data).eq("id", id).select(MED_COLS).maybeSingle()),

  remove: async (id) => {
    unwrap(await supabase().from("medicines").delete().eq("id", id));
  },

  countForPatient: async (patientId) =>
    unwrap(await supabase().from("medicines").select("id").eq("patient_id", patientId)).length,
};

export const Dose = {
  findSince: async (medicineIds, from) =>
    medicineIds.length
      ? unwrap(
          await supabase().from("dose_logs").select("medicine_id, date, slot, status")
            .in("medicine_id", medicineIds).gte("date", from)
        )
      : [],

  // Sets a slot to taken/skipped, or clears it when status is null.
  set: async ({ medicineId, date, slot, status }) => {
    const db = supabase();
    if (status === null) {
      unwrap(await db.from("dose_logs").delete().eq("medicine_id", medicineId).eq("date", date).eq("slot", slot));
      return;
    }
    const { error } = await db.from("dose_logs").upsert(
      { medicine_id: medicineId, date, slot, status, logged_at: new Date().toISOString() },
      { onConflict: "medicine_id,date,slot" }
    );
    // Medicine was deleted between the existence check and the write.
    if (error?.code === FOREIGN_KEY_VIOLATION) throw new HttpError(404, "Medicine not found.");
    unwrap({ error });
  },
};

export const User = {
  findById: async (id) => unwrap(await supabase().from("users").select(USER_COLS).eq("id", id).maybeSingle()),
  findByEmail: async (email) => unwrap(await supabase().from("users").select(USER_COLS).eq("email", email).maybeSingle()),
  findByInviteCode: async (code) =>
    unwrap(await supabase().from("users").select(USER_COLS).eq("invite_code", code).maybeSingle()),
  findByIds: async (ids) =>
    ids.length ? unwrap(await supabase().from("users").select(USER_COLS).in("id", ids)) : [],
  list: async () => unwrap(await supabase().from("users").select(USER_COLS).order("id")),
  listByRole: async (role) => unwrap(await supabase().from("users").select(USER_COLS).eq("role", role).order("name")),
  anyExists: async () => unwrap(await supabase().from("users").select("id").limit(1)).length > 0,
  countAdmins: async () => unwrap(await supabase().from("users").select("id").eq("role", "admin")).length,
  create: async (data) => unwrap(await supabase().from("users").insert(data).select(USER_COLS).single()),
  update: async (id, data) =>
    unwrap(await supabase().from("users").update(data).eq("id", id).select(USER_COLS).maybeSingle()),
  remove: async (id) => {
    unwrap(await supabase().from("users").delete().eq("id", id));
  },
};

export const Session = {
  create: async (data) => unwrap(await supabase().from("sessions").insert(data).select("id").single()),
  findByHash: async (hash) =>
    unwrap(await supabase().from("sessions").select("id, user_id, remember, last_used_at, expires_at").eq("token_hash", hash).maybeSingle()),
  touch: async (id) => {
    unwrap(await supabase().from("sessions").update({ last_used_at: new Date().toISOString() }).eq("id", id));
  },
  removeById: async (id) => {
    unwrap(await supabase().from("sessions").delete().eq("id", id));
  },
  removeForUser: async (userId, exceptId = null) => {
    let q = supabase().from("sessions").delete().eq("user_id", userId);
    if (exceptId) q = q.neq("id", exceptId);
    unwrap(await q);
  },
};

export const Link = {
  find: async (patientId, guardianId) =>
    unwrap(await supabase().from("guardian_links").select("id, patient_id, guardian_id").eq("patient_id", patientId).eq("guardian_id", guardianId).maybeSingle()),
  findById: async (id) =>
    unwrap(await supabase().from("guardian_links").select("id, patient_id, guardian_id").eq("id", id).maybeSingle()),
  forPatient: async (patientId) =>
    unwrap(await supabase().from("guardian_links").select("id, patient_id, guardian_id").eq("patient_id", patientId).order("id")),
  forGuardian: async (guardianId) =>
    unwrap(await supabase().from("guardian_links").select("id, patient_id, guardian_id").eq("guardian_id", guardianId).order("id")),
  all: async () => unwrap(await supabase().from("guardian_links").select("id, patient_id, guardian_id").order("id")),
  create: async (patientId, guardianId) =>
    unwrap(await supabase().from("guardian_links").insert({ patient_id: patientId, guardian_id: guardianId }).select("id, patient_id, guardian_id").single()),
  remove: async (id) => {
    unwrap(await supabase().from("guardian_links").delete().eq("id", id));
  },
  removeForPatient: async (patientId) => {
    unwrap(await supabase().from("guardian_links").delete().eq("patient_id", patientId));
  },
  removeForGuardian: async (guardianId) => {
    unwrap(await supabase().from("guardian_links").delete().eq("guardian_id", guardianId));
  },
};
