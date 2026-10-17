// Persisted bell notifications (migration 016). The client used to keep
// these only in memory, filled by live socket pushes - so anything that
// happened while you were offline was lost. Now a push is written here
// first, then emitted; the client loads the list on login.

import { pool } from "./pool.js";

const LIST_LIMIT = 30;

export async function createNotification({ userId, kind, message, target }) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, kind, message, target)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [userId, kind, message, target || null]
  );
  return rows[0];
}

export async function listNotifications(userId, limit = LIST_LIMIT) {
  const { rows } = await pool.query(
    `SELECT id, kind, message, target, created_at, read_at
     FROM notifications WHERE user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows;
}

export async function markAllNotificationsRead(userId) {
  await pool.query(
    "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
    [userId]
  );
}

/** Shape sent to the client - same fields the socket push carries. */
export function publicNotification(n) {
  return {
    id: n.id,
    kind: n.kind,
    message: n.message,
    target: n.target,
    createdAt: new Date(n.created_at).getTime(),
    read: Boolean(n.read_at),
  };
}
