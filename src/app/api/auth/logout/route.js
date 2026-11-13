import { route } from "@/lib/server/errors";
import { endSession } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  await endSession();
  return new Response(null, { status: 204 });
});
