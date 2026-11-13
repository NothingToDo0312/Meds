// Usage: node scripts/make-admin-sql.mjs "Admin Name" admin@example.com "YourPassword"
// Prints SQL to paste into the Supabase SQL editor. Uses the same scrypt format as the app.
import { randomBytes, scryptSync } from "node:crypto";

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.error('Usage: node scripts/make-admin-sql.mjs "Name" email "Password"');
  process.exit(1);
}
const salt = randomBytes(16);
const key = scryptSync(password, salt, 64);
const hash = `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

console.log(`INSERT INTO users (name, email, password_hash, role, timezone)
VALUES (${q(name)}, ${q(email.trim().toLowerCase())}, ${q(hash)}, 'admin', 'UTC');`);
