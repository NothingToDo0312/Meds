import { createClient } from "@supabase/supabase-js";
import { HttpError } from "./errors";

let client;

// The service-role key bypasses RLS, so it must stay on the server. This file
// is only imported by API routes.
export function supabase() {
  if (client) return client;

  const url = (process.env.SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key)
    throw new HttpError(503, "Server not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (in .env.local locally, or in the Vercel project's Environment Variables, then redeploy).");

  if (key.startsWith("sb_publishable_"))
    throw new HttpError(503, "SUPABASE_SERVICE_ROLE_KEY is a publishable key. Use the service_role / secret key.");
  const parts = key.split(".");
  if (parts.length === 3) {
    try {
      const { role } = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      if (role === "anon")
        throw new HttpError(503, "SUPABASE_SERVICE_ROLE_KEY is the anon key. Use the service_role key.");
    } catch (e) {
      if (e instanceof HttpError) throw e; // otherwise not a decodable JWT; let Supabase decide
    }
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
