// One-off CLI to promote an account - mainly for seeding the very first
// admin, since there's no UI path to become admin (by design: it's not
// self-service). Usage:
//
//   node scripts/set-role.js someone@example.com admin
//   node scripts/set-role.js someone@example.com shop_owner
//   node scripts/set-role.js someone@example.com customer

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;
const VALID_ROLES = ["customer", "shop_owner", "admin"];

async function main() {
  const [email, role] = process.argv.slice(2);
  if (!email || !VALID_ROLES.includes(role)) {
    console.error(`Usage: node scripts/set-role.js <email> <${VALID_ROLES.join("|")}>`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set - copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  const { rows } = await pool.query(
    "UPDATE users SET role = $1 WHERE email = $2 RETURNING id, email, display_name, role",
    [role, email.trim().toLowerCase()]
  );
  await pool.end();

  if (!rows[0]) {
    console.error(`No account with email ${email}`);
    process.exit(1);
  }
  console.log(`[set-role] ${rows[0].email} (${rows[0].display_name}) is now "${rows[0].role}"`);
}

main().catch((err) => {
  console.error("[set-role] failed:", err);
  process.exit(1);
});
