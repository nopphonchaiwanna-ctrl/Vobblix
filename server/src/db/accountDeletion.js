// Admin side of account deletion requests (migration 003's table, 017's
// processed_* columns). Approving one anonymizes the account rather than
// deleting the users row: several foreign keys CASCADE from users
// (tournament_players -> matches, shop_orders), so a real DELETE would
// also wipe other people's event standings and order history.

import { pool } from "./pool.js";

export const DELETED_DISPLAY_NAME = "Deleted user";

export async function listPendingDeletionRequests() {
  const { rows } = await pool.query(
    `SELECT r.id, r.user_id, r.reason, r.created_at,
            u.display_name, u.email, u.role, u.created_at AS user_created_at,
            (SELECT count(*)::int FROM shop_orders o
               WHERE (o.buyer_id = u.id OR o.seller_id = u.id) AND o.status IN ('inquiry', 'confirmed')) AS open_orders,
            (SELECT count(*)::int FROM shops s
               WHERE s.owner_user_id = u.id AND NOT s.is_admin_shop) AS owned_shops
     FROM account_deletion_requests r
     JOIN users u ON u.id = r.user_id
     WHERE r.status = 'pending'
     ORDER BY r.created_at ASC`
  );
  return rows;
}

/**
 * Everything an admin needs before deciding one request: the account,
 * exactly which shops/orders/event entries approving would touch, how
 * much else would be wiped, and the user's earlier requests. Null if no
 * such request.
 */
export async function getDeletionRequestDetail(requestId) {
  const reqRes = await pool.query("SELECT * FROM account_deletion_requests WHERE id = $1", [requestId]);
  const request = reqRes.rows[0];
  if (!request) return null;
  const userId = request.user_id;

  const [user, shops, openOrders, activeEvents, counts, history] = await Promise.all([
    pool.query(
      `SELECT id, display_name, email, role, avatar_url, created_at, email_verified_at, deleted_at
       FROM users WHERE id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT id, code, name, status FROM shops
       WHERE owner_user_id = $1 AND NOT is_admin_shop ORDER BY created_at`,
      [userId]
    ),
    pool.query(
      `SELECT o.id, o.status, o.quantity, o.created_at, l.title AS listing_title, s.name AS shop_name,
              CASE WHEN o.buyer_id = $1 THEN 'buyer' ELSE 'seller' END AS side,
              other.display_name AS other_party
       FROM shop_orders o
       JOIN shop_listings l ON l.id = o.listing_id
       JOIN shops s ON s.id = o.shop_id
       JOIN users other ON other.id = CASE WHEN o.buyer_id = $1 THEN o.seller_id ELSE o.buyer_id END
       WHERE (o.buyer_id = $1 OR o.seller_id = $1) AND o.status IN ('inquiry', 'confirmed')
       ORDER BY o.created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT e.id, e.name, e.status, s.name AS shop_name
       FROM tournament_players p
       JOIN tournament_events e ON e.id = p.event_id
       JOIN shops s ON s.id = e.shop_id
       WHERE p.user_id = $1 AND NOT p.dropped AND e.status IN ('registration', 'swiss', 'bracket')
       ORDER BY e.created_at DESC`,
      [userId]
    ),
    pool.query(
      `SELECT
         (SELECT count(*)::int FROM decks WHERE user_id = $1) AS decks,
         (SELECT count(*)::int FROM chat_messages WHERE user_id = $1) AS chat_messages,
         (SELECT count(*)::int FROM tournament_players WHERE user_id = $1) AS events_played,
         (SELECT count(*)::int FROM shop_orders WHERE buyer_id = $1 OR seller_id = $1) AS orders_total`,
      [userId]
    ),
    pool.query(
      `SELECT r.id, r.status, r.reason, r.decline_reason, r.created_at, r.processed_at,
              a.display_name AS processed_by_name
       FROM account_deletion_requests r
       LEFT JOIN users a ON a.id = r.processed_by
       WHERE r.user_id = $1 AND r.id <> $2
       ORDER BY r.created_at DESC`,
      [userId, requestId]
    ),
  ]);

  return {
    request,
    user: user.rows[0],
    shops: shops.rows,
    openOrders: openOrders.rows,
    activeEvents: activeEvents.rows,
    counts: counts.rows[0],
    history: history.rows,
  };
}

/**
 * Anonymizes the requesting account in one transaction. Returns null if
 * the request isn't pending any more; throws { code: "IS_ADMIN" } for an
 * admin account (demote it first, so the last admin can't vanish).
 *
 * What happens to the account's data:
 * - users row: email/name/avatar/password scrubbed, role customer, deleted_at set
 * - deleted: decks, block lists (both directions), notifications,
 *   auth tokens, shop-owner applications
 * - chat messages keep their text but lose the author's name
 * - their owner shop is suspended and its listings archived
 * - open orders (inquiry/confirmed) on either side are cancelled
 * - registrations for events that haven't started are dropped; past
 *   results stay, shown as "Deleted user"
 */
export async function approveDeletionRequest(requestId, adminUserId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reqRes = await client.query(
      "SELECT * FROM account_deletion_requests WHERE id = $1 AND status = 'pending' FOR UPDATE",
      [requestId]
    );
    const request = reqRes.rows[0];
    if (!request) {
      await client.query("ROLLBACK");
      return null;
    }
    const userId = request.user_id;
    const { rows: userRows } = await client.query("SELECT role FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (userRows[0]?.role === "admin") {
      await client.query("ROLLBACK");
      throw Object.assign(new Error("Admin accounts can't be deleted - remove the admin role first."), { code: "IS_ADMIN" });
    }

    await client.query(
      `UPDATE users SET
         email = 'deleted+' || id || '@deleted.invalid',
         display_name = $2,
         avatar_url = NULL,
         password_hash = '!deleted',
         role = 'customer',
         deleted_at = now()
       WHERE id = $1`,
      [userId, DELETED_DISPLAY_NAME]
    );
    for (const sql of [
      "DELETE FROM decks WHERE user_id = $1",
      "DELETE FROM blocked_users WHERE user_id = $1 OR blocked_user_id = $1",
      "DELETE FROM notifications WHERE user_id = $1",
      "DELETE FROM email_verification_tokens WHERE user_id = $1",
      "DELETE FROM password_reset_tokens WHERE user_id = $1",
      "DELETE FROM shop_owner_applications WHERE user_id = $1",
    ]) {
      await client.query(sql, [userId]);
    }
    await client.query("UPDATE chat_messages SET author_name = $2 WHERE user_id = $1", [userId, DELETED_DISPLAY_NAME]);

    const shops = await client.query(
      `UPDATE shops SET status = 'suspended'
       WHERE owner_user_id = $1 AND NOT is_admin_shop
       RETURNING id`,
      [userId]
    );
    if (shops.rowCount > 0) {
      await client.query("UPDATE shop_listings SET status = 'archived' WHERE shop_id = ANY($1)", [shops.rows.map((s) => s.id)]);
    }
    const orders = await client.query(
      `UPDATE shop_orders SET status = 'cancelled'
       WHERE (buyer_id = $1 OR seller_id = $1) AND status IN ('inquiry', 'confirmed')`,
      [userId]
    );
    const registrations = await client.query(
      `UPDATE tournament_players SET dropped = true
       WHERE user_id = $1 AND NOT dropped
         AND event_id IN (SELECT id FROM tournament_events WHERE status = 'registration')`,
      [userId]
    );

    await client.query(
      `UPDATE account_deletion_requests
       SET status = 'completed', processed_at = now(), processed_by = $2
       WHERE id = $1`,
      [requestId, adminUserId]
    );
    await client.query("COMMIT");
    return {
      userId,
      suspendedShops: shops.rowCount,
      cancelledOrders: orders.rowCount,
      droppedRegistrations: registrations.rowCount,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Closes a pending request without touching the account; null if not pending. */
export async function declineDeletionRequest(requestId, adminUserId, reason) {
  const { rows } = await pool.query(
    `UPDATE account_deletion_requests
     SET status = 'cancelled', processed_at = now(), processed_by = $2, decline_reason = $3
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [requestId, adminUserId, reason]
  );
  return rows[0] || null;
}
