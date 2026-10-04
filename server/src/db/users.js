// Postgres access for account-settings that aren't part of the core
// auth flow (routes/auth.js's register/login/me): updating your own
// profile fields, changing your password hash, and the self-service
// "please delete my account" request (see migration 003 and
// routes/account.js).

import { pool } from "./pool.js";

/**
 * Updates only the fields that are present (not undefined) in `fields`,
 * so a caller can send just `{ displayName }` without clobbering
 * avatar_url, or vice versa.
 */
export async function updateProfile(userId, { displayName, avatarUrl }) {
  const sets = [];
  const values = [userId];

  if (displayName !== undefined) {
    values.push(displayName);
    sets.push(`display_name = $${values.length}`);
  }
  if (avatarUrl !== undefined) {
    values.push(avatarUrl);
    sets.push(`avatar_url = $${values.length}`);
  }
  if (sets.length === 0) {
    const { rows } = await pool.query(
      "SELECT id, email, display_name, avatar_url, role FROM users WHERE id = $1",
      [userId]
    );
    return rows[0];
  }

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $1
     RETURNING id, email, display_name, avatar_url, role`,
    values
  );
  return rows[0];
}

// Fetched once per socket connection (see index.js's io.use()) rather
// than baked into the JWT - see auth.js's verifyToken() for why
// avatarUrl in particular can't ride in the token anymore now that it
// can be a resized-photo data: URL instead of a short plain link.
// Looked up by email for login (routes/auth.js already does its own
// inline query there) and by the new /resend-verification and
// /forgot-password endpoints, which both need to go from "an email
// address someone typed into a form" to a user row without leaking
// whether that address is registered (both endpoints respond success
// either way - see routes/auth.js).
export async function findByEmail(email) {
  const { rows } = await pool.query(
    "SELECT id, email, display_name, avatar_url, role, email_verified_at FROM users WHERE email = $1",
    [email]
  );
  return rows[0] || null;
}

export async function markEmailVerified(userId) {
  await pool.query("UPDATE users SET email_verified_at = now() WHERE id = $1", [userId]);
}

export async function getAvatarUrl(userId) {
  const { rows } = await pool.query("SELECT avatar_url FROM users WHERE id = $1", [userId]);
  return rows[0]?.avatar_url || null;
}

export async function getPasswordHash(userId) {
  const { rows } = await pool.query("SELECT password_hash FROM users WHERE id = $1", [userId]);
  return rows[0]?.password_hash || null;
}

export async function updatePasswordHash(userId, passwordHash) {
  await pool.query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
}

// ---------- Account deletion requests ----------

export async function createDeletionRequest(userId, reason) {
  const { rows } = await pool.query(
    `INSERT INTO account_deletion_requests (user_id, reason) VALUES ($1, $2) RETURNING *`,
    [userId, reason || null]
  );
  return rows[0];
}

export async function latestDeletionRequestForUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM account_deletion_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}
