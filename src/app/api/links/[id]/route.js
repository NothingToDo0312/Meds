import { route, HttpError } from "@/lib/server/errors";
import { Link } from "@/lib/server/models";
import { requireUser } from "@/lib/server/auth";
import { validateId } from "@/lib/server/validators";

export const dynamic = "force-dynamic";

// The patient, the guardian, or an admin can end a link.
export const DELETE = route(async (req, { params }) => {
  const user = await requireUser();
  const link = await Link.findById(validateId((await params).id, "link id"));
  if (link) {
    const allowed = user.role === "admin" || link.patient_id === user.id || link.guardian_id === user.id;
    if (!allowed) throw new HttpError(403, "You don't have permission to do that.");
    await Link.remove(link.id);
  }
  return new Response(null, { status: 204 });
});
