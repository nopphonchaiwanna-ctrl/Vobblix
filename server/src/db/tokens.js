// Email-verification and password-reset tokens. Both are random,
// single-use, short-lived strings emailed to the account's address
// (see ../email.js) and redeemed by one HTTP call (see
// routes/auth.js's /verify-email and /reset-password). Only a SHA-256
// hash of the token is stored - see migration 005 for why.
//
// "Consume" is a single UPDATE ... RETURNING that only matches a row
// that's unused and unexpired, so redeeming a token is atomic: two
// near-simultaneous requests with the same token can't both succeed,
// and there's no separate "check then use" race to get wrong.

import crypto from "node:crypto";
import { pool } from "./pool.js";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ---------- Email verification (24h) ----------

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export async function createEmailVerificationToken(userId) {
  const rawToken = randomToken();
  const expiresAt = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(rawToken), expiresAt]
  );
  return rawToken;
}

/** Returns the userId it belongs to, or null if invalid/expired/already used. */
export async function consumeEmailVerificationToken(rawToken) {
  const { rows } = await pool.query(
    `UPDATE email_verification_tokens
     SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hashToken(rawToken)]
  );
  return rows[0]?.user_id || null;
}

// ---------- Password reset (1h - shorter-lived, since it grants a
// password change rather than just flipping a verified flag) ----------

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export async function createPasswordResetToken(userId) {
  const rawToken = randomToken();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hashToken(rawToken), expiresAt]
  );
  return rawToken;
}

/** Returns the userId it belongs to, or null if invalid/expired/already used. */
export async function consumePasswordResetToken(rawToken) {
  const { rows } = await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING user_id`,
    [hashToken(rawToken)]
  );
  return rows[0]?.user_id || null;
}
