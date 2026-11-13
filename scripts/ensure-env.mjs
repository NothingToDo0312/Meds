// Runs before `npm run dev`: creates .env.local from the example on first run.
import { existsSync, copyFileSync } from "node:fs";

if (!existsSync(".env.local") && !existsSync(".env")) {
  copyFileSync(".env.example", ".env.local");
  console.log("\nCreated .env.local. Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then restart.\n");
}
