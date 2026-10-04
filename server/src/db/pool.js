import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set - copy server/.env.example to server/.env " +
      "and fill it in. Queries will fail until it's configured."
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Most hosted Postgres (Neon, Supabase, Railway, RDS, ...) requires TLS
  // with a cert chain `pg` won't verify out of the box. Relax verification
  // only when the connection string opts into TLS; a plain local Postgres
  // URL (no sslmode) is unaffected.
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  // A dropped idle connection shouldn't crash the whole process.
  console.error("[db] unexpected error on idle client", err);
});
