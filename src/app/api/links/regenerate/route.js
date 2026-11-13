import { route } from "@/lib/server/errors";
import { User } from "@/lib/server/models";
import { requireRole } from "@/lib/server/auth";
import { newInviteCode } from "@/lib/server/accounts";

export const dynamic = "force-dynamic";

// New invite code for a patient (existing guardians stay linked).
export const POST = route(async () => {
  const user = await requireRole("patient");
  const updated = await User.update(user.id, { invite_code: await newInviteCode() });
  return Response.json({ invite_code: updated.invite_code });
});
