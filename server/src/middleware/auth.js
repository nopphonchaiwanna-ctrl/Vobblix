// Shared HTTP auth for the REST routes (sockets have their own io.use()
// middleware in index.js - this is the same token, just parsed from an
// Authorization header instead of the socket handshake).

import { verifyToken } from "../auth.js";
import { pool } from "../db/pool.js";

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Not authenticated." });
  req.auth = payload; // { userId, displayName }
  next();
}

/**
 * Re-reads the caller's current role from Postgres on every call instead
 * of trusting a possibly-stale JWT claim (tokens live 30 days - see
 * auth.js), so an admin's approval takes effect on the very next request
 * instead of waiting for the approved user to log out and back in.
 */
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const { rows } = await pool.query("SELECT role FROM users WHERE id = $1", [req.auth.userId]);
      const role = rows[0]?.role;
      if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({ error: "You don't have permission to do that." });
      }
      req.auth.role = role;
      next();
    } catch (err) {
      next(err);
    }
  };
}
