// One-off CLI to seed two ready-to-use dev accounts (a plain customer
// and a shop_owner), bypassing the email-verification flow entirely by
// inserting directly with email_verified_at already set. Not wired into
// any npm script on purpose - this is a manual dev convenience, same
// spirit as set-role.js.
//
//   node scripts/seed-test-accounts.js
//
// Re-running is safe: existing rows (matched by email) just get their
// password/role/verified status reset rather than erroring out.

import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const { Pool } = pg;
const SALT_ROUNDS = 10;

const ACCOUNTS = [
  {
    email: "user1@test.local",
    password: "Test1234!",
    displayName: "Test User",
    role: "customer",
  },
  {
    email: "shop1@test.local",
    password: "Test1234!",
    displayName: "Test Shop Owner",
    role: "shop_owner",
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set - copy server/.env.example to server/.env and fill it in.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
  });

  for (const acct of ACCOUNTS) {
    const passwordHash = await bcrypt.hash(acct.password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, role, email_verified_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         role = EXCLUDED.role,
         email_verified_at = now()
       RETURNING id, email, display_name, role`,
      [acct.email, passwordHash, acct.displayName, acct.role]
    );
    console.log(`[seed] ${rows[0].email} (${rows[0].display_name}) role="${rows[0].role}" password="${acct.password}"`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
