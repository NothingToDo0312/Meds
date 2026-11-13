import { supabase } from "@/lib/server/supabase";
import { route } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

// Liveness + database check, handy right after setup.
export const GET = route(async () => {
  const { error } = await supabase().from("medicines").select("id").limit(1);
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    return Response.json(
      { ok: false, db: missing ? "tables missing: run database/schema.sql" : error.message },
      { status: 503 }
    );
  }
  return Response.json({ ok: true, db: "connected" });
});
