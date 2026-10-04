// Postgres access for the per-user chat block list (migration 004) -
// see routes/account.js for the endpoints and client/src/ui/chat.js for
// how the blocked-id set gets used (filtering rendered chat messages).

import { pool } from "./pool.js";

export async function blockUser(userId, blockedUserId) {
  await pool.query(
    `INSERT INTO blocked_users (user_id, blocked_user_id) VALUES ($1, $2)
     ON CONFLICT (user_id, blocked_user_id) DO NOTHING`,
    [userId, blockedUserId]
  );
}

export async function unblockUser(userId, blockedUserId) {
  await pool.query(`DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2`, [
    userId,
    blockedUserId,
  ]);
}

/** The blocked accounts' id + display name, for the Settings page's
 *  "Blocked users" list. */
export async function listBlockedUsers(userId) {
  const { rows } = await pool.query(
    `SELECT u.id, u.display_name AS "displayName"
     FROM blocked_users b
     JOIN users u ON u.id = b.blocked_user_id
     WHERE b.user_id = $1
     ORDER BY u.display_name ASC`,
    [userId]
  );
  return rows;
}
