// Password hashing + JWT issuing/verification for account login. Kept
// separate from routes/auth.js (HTTP layer) and index.js (socket layer)
// so both can share the same token verification logic.

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const TOKEN_TTL = "30d";

function requireSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set - copy server/.env.example to server/.env and fill it in."
    );
  }
  return secret;
}

// Shared password-strength rule for every "set a password" entry point
// (register, reset-password, change-password - see routes/auth.js and
// routes/account.js). Keeping the check and its error message in one
// place means all three can't quietly drift out of sync with each
// other - a password rejected by one must be rejected by all of them.
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const PASSWORD_REQUIREMENT_MESSAGE =
  "Password must be at least 8 characters and include at least one uppercase letter, one number, and one special character.";

export function isStrongPassword(password) {
  return typeof password === "string" && PASSWORD_RE.test(password);
}

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, displayName: user.display_name },
    requireSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

/**
 * Returns { userId, displayName } or null if the token is
 * missing/invalid/expired. displayName is baked in at login time (see
 * signToken) - a display-name change made in Settings only reaches an
 * already-open socket connection after the next login.
 *
 * avatarUrl deliberately does NOT live in the token (it used to -
 * see db/users.js's getAvatarUrl() and index.js's io.use() for where
 * it's fetched instead): avatars can now be a resized photo encoded as
 * a data: URL, tens of KB, and Node's default max HTTP header size is
 * only ~16KB. Baking that into the JWT would blow past that the moment
 * anyone uploaded a real photo and break every single authenticated
 * request (the token rides in the Authorization header on all of
 * them), not just the one request that set it.
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, requireSecret());
    return { userId: payload.sub, displayName: payload.displayName };
  } catch {
    return null;
  }
}
