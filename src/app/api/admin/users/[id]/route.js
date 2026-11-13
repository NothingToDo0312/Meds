import { route, readJson, HttpError } from "@/lib/server/errors";
import { Link, Medicine, Session, User } from "@/lib/server/models";
import { hashPassword, publicUser, requireRole } from "@/lib/server/auth";
import { newInviteCode } from "@/lib/server/accounts";
import { validateId, validateName, validatePassword, validateRole } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

async function loadTarget(params) {
  const target = await User.findById(validateId((await params).id, "user id"));
  if (!target) throw new HttpError(404, "User not found.");
  return target;
}

// Rename, reset password, or change role.
export const PATCH = route(async (req, { params }) => {
  await requireRole("admin");
  const target = await loadTarget(params);
  const body = await readJson(req);
  const patch = {};

  if (body.name !== undefined) patch.name = validateName(body.name);
  if (body.password !== undefined) patch.password_hash = await hashPassword(validatePassword(body.password));

  const roleChange = body.role !== undefined && body.role !== target.role;
  if (roleChange) {
    const role = validateRole(body.role, { allowAdmin: true });
    if (target.role === "admin" && (await User.countAdmins()) <= 1)
      throw new HttpError(409, "There must be at least one admin.");
    if (target.role === "patient" && (await Medicine.countForPatient(target.id)) > 0)
      throw new HttpError(409, "Delete this patient's medicines before changing their role.");
    patch.role = role;
    patch.invite_code = role === "patient" ? target.invite_code || (await newInviteCode()) : null;
  }

  const updated = Object.keys(patch).length ? await User.update(target.id, patch) : target;

  if (roleChange) {
    if (target.role === "patient") await Link.removeForPatient(target.id);
    if (target.role === "guardian") await Link.removeForGuardian(target.id);
  }
  if (patch.password_hash) await Session.removeForUser(target.id);

  return Response.json(publicUser(updated));
});

export const DELETE = route(async (req, { params }) => {
  const admin = await requireRole("admin");
  const target = await loadTarget(params);
  if (target.id === admin.id) throw new HttpError(409, "You can't delete your own account.");
  if (target.role === "admin" && (await User.countAdmins()) <= 1)
    throw new HttpError(409, "There must be at least one admin.");
  await User.remove(target.id); // sessions, links, medicines and dose logs cascade
  return new Response(null, { status: 204 });
});
