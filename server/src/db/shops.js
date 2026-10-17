// Postgres-backed shop metadata and chat history. Live-only state
// (who's connected right now, positions, current table) stays in
// rooms.js's in-memory map - it doesn't need to survive a restart.
//
// Two kinds of shop live in the same `shops` table (see migration 002):
//   - Plain rooms with no owner (owner_user_id NULL) - today only the
//     lobby's "default" room (migration 017). join-shop used to create
//     one for any code typed; it no longer does.
//   - Owner-created marketplace shops: createOwnedShop() and friends,
//     reached only through the "become a shop owner" flow (see
//     routes/shops.js). These carry owner_user_id + a review status.

import { pool } from "./pool.js";

/** The shop a lobby join code points at, or null - join-shop never creates one. */
export async function getShopByCode(code) {
  const { rows } = await pool.query("SELECT * FROM shops WHERE code = $1", [code]);
  return rows[0] || null;
}

export async function getShopById(id) {
  const { rows } = await pool.query("SELECT * FROM shops WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function getShopByOwner(ownerUserId) {
  const { rows } = await pool.query("SELECT * FROM shops WHERE owner_user_id = $1", [ownerUserId]);
  return rows[0] || null;
}

const CODE_RE = /^[a-z0-9-]{3,24}$/;

export function isValidShopCode(code) {
  return CODE_RE.test(code || "");
}

/** Creates a new owner-created shop in `pending_review` - see routes/shops.js. */
export async function createOwnedShop({
  ownerUserId,
  code,
  name,
  description,
  layoutTemplateId,
  theme,
  logoUrl,
}) {
  const { rows } = await pool.query(
    // The CTE also logs a 'submitted' row in shop_review_events (migration
    // 016) in the same statement, so history can never miss a shop.
    `WITH s AS (
       INSERT INTO shops
         (code, name, scene_type, owner_user_id, status, layout_template_id, theme, logo_url, description)
       VALUES ($1, $2, 'owned', $3, 'pending_review', $4, $5, $6, $7)
       RETURNING *
     ), e AS (
       INSERT INTO shop_review_events (shop_id, action, actor_user_id)
       SELECT id, 'submitted', owner_user_id FROM s
     )
     SELECT * FROM s`,
    [code, name, ownerUserId, layoutTemplateId, theme, logoUrl || null, description || null]
  );
  return rows[0];
}

/**
 * Owner-scoped edit. Editing a rejected shop resubmits it (back to
 * pending_review, clearing the rejection reason) - editing a published
 * or already-pending shop leaves its status alone. Returns null if the
 * shop doesn't exist or isn't owned by ownerUserId.
 */
/**
 * Admin-only "central shop" - unlike createOwnedShop(), this publishes
 * immediately (status = 'published' right away, no pending_review step)
 * and is flagged is_admin_shop so the one-shop-per-owner unique index
 * (shops_one_per_owner_idx, narrowed in migration 015) doesn't apply to
 * it - the same admin account can create as many of these as it wants.
 * reviewed_by/reviewed_at are still filled in (with the creating admin
 * themselves) purely for display/audit consistency with owner-created
 * shops, even though no separate review actually happened.
 */
export async function createAdminShop({
  createdBy,
  code,
  name,
  description,
  layoutTemplateId,
  theme,
  logoUrl,
}) {
  const { rows } = await pool.query(
    `INSERT INTO shops
       (code, name, scene_type, owner_user_id, status, is_admin_shop,
        layout_template_id, theme, logo_url, description, reviewed_by, reviewed_at)
     VALUES ($1, $2, 'owned', $3, 'published', true, $4, $5, $6, $7, $3, now())
     RETURNING *`,
    [code, name, createdBy, layoutTemplateId, theme, logoUrl || null, description || null]
  );
  return rows[0];
}

/** Every admin-created central shop, newest first - powers the admin panel's own "Central shops" list. */
export async function listAdminShops() {
  const { rows } = await pool.query(
    `SELECT s.*, u.display_name AS creator_name
     FROM shops s
     JOIN users u ON u.id = s.owner_user_id
     WHERE s.is_admin_shop
     ORDER BY s.created_at DESC`
  );
  return rows;
}

export async function updateOwnedShop(shopId, ownerUserId, fields) {
  const shop = await getShopById(shopId);
  if (!shop || shop.owner_user_id !== ownerUserId) return null;

  const next = {
    name: fields.name ?? shop.name,
    description: fields.description ?? shop.description,
    layout_template_id: fields.layoutTemplateId ?? shop.layout_template_id,
    theme: fields.theme ?? shop.theme,
    logo_url: fields.logoUrl ?? shop.logo_url,
  };
  const resubmitting = shop.status === "rejected";

  const { rows } = await pool.query(
    // Clearing rejection_reason here is why shop_review_events exists:
    // the 'rejected' row there keeps the old reason after this wipes it.
    `WITH s AS (
       UPDATE shops SET
         name = $1, description = $2, layout_template_id = $3, theme = $4, logo_url = $5,
         status = CASE WHEN $6::boolean THEN 'pending_review' ELSE status END,
         rejection_reason = CASE WHEN $6::boolean THEN NULL ELSE rejection_reason END,
         reviewed_by = CASE WHEN $6::boolean THEN NULL ELSE reviewed_by END,
         reviewed_at = CASE WHEN $6::boolean THEN NULL ELSE reviewed_at END
       WHERE id = $7
       RETURNING *
     ), e AS (
       INSERT INTO shop_review_events (shop_id, action, actor_user_id)
       SELECT id, 'resubmitted', owner_user_id FROM s WHERE $6::boolean
     )
     SELECT * FROM s`,
    [next.name, next.description, next.layout_template_id, next.theme, next.logo_url, resubmitting, shopId]
  );
  return rows[0];
}

/** Admin review queue - owned shops only (ad-hoc shops are never reviewed). */
export async function listShopsByStatus(status) {
  const { rows } = await pool.query(
    `SELECT s.*, u.display_name AS owner_name, u.email AS owner_email
     FROM shops s JOIN users u ON u.id = s.owner_user_id
     WHERE s.status = $1
     ORDER BY s.created_at ASC`,
    [status]
  );
  return rows;
}

export async function setShopReviewStatus(shopId, { status, reviewedBy, rejectionReason }) {
  const { rows } = await pool.query(
    // Also appends to shop_review_events (migration 016) atomically -
    // `status` doubles as the event action ('published' | 'rejected').
    `WITH s AS (
       UPDATE shops SET status = $1, reviewed_by = $2, reviewed_at = now(), rejection_reason = $3
       WHERE id = $4 AND owner_user_id IS NOT NULL
       RETURNING *
     ), e AS (
       INSERT INTO shop_review_events (shop_id, action, actor_user_id, reason)
       SELECT id, $1, $2, $3 FROM s
     )
     SELECT * FROM s`,
    [status, reviewedBy, rejectionReason || null, shopId]
  );
  return rows[0] || null;
}

/**
 * Admin panel's Review history tab - every logged review step across all
 * owner shops, newest first (see migration 016). Joins the shop's
 * *current* name/code, plus who did the step (the owner for
 * submitted/resubmitted, the admin for published/rejected).
 */
export async function listShopReviewEvents({ limit = 200 } = {}) {
  const { rows } = await pool.query(
    `SELECT e.id, e.shop_id, e.action, e.reason, e.created_at,
            s.name AS shop_name, s.code AS shop_code, s.status AS shop_status,
            o.display_name AS owner_name,
            a.display_name AS actor_name
     FROM shop_review_events e
     JOIN shops s ON s.id = e.shop_id
     LEFT JOIN users o ON o.id = s.owner_user_id
     LEFT JOIN users a ON a.id = e.actor_user_id
     ORDER BY e.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

/**
 * Review history detail page - one owner shop (with its owner's contact)
 * plus its whole review timeline, oldest first. Returns null if there's
 * no owner shop with that id (central shops never go through review).
 */
export async function getShopReviewDetail(shopId) {
  const shopRes = await pool.query(
    `SELECT s.*, u.display_name AS owner_name, u.email AS owner_email
     FROM shops s JOIN users u ON u.id = s.owner_user_id
     WHERE s.id = $1`,
    [shopId]
  );
  const shop = shopRes.rows[0];
  if (!shop) return null;
  const { rows: events } = await pool.query(
    `SELECT e.id, e.action, e.reason, e.created_at, a.display_name AS actor_name
     FROM shop_review_events e
     LEFT JOIN users a ON a.id = e.actor_user_id
     WHERE e.shop_id = $1
     ORDER BY e.created_at ASC`,
    [shopId]
  );
  return { shop, events };
}

/** Public marketplace directory - published owner shops only, minimal fields. */
// Powers the lobby's "Published shops" list - owner_name and
// listing_count exist purely to make each row worth more than a name
// and a description (see client's renderPublishedShops()): who runs
// it, and whether it's actually stocked with anything to buy yet.
// listing_count only counts 'active' listings (what a visitor could
// actually buy right now), not sold-out/archived ones.
export async function listPublishedShops() {
  const { rows } = await pool.query(
    `SELECT
       s.id, s.code, s.name, s.description, s.logo_url, s.theme, s.created_at,
       u.display_name AS owner_name,
       COALESCE(l.listing_count, 0)::int AS listing_count
     FROM shops s
     JOIN users u ON u.id = s.owner_user_id
     LEFT JOIN (
       SELECT shop_id, COUNT(*) AS listing_count
       FROM shop_listings
       WHERE status = 'active'
       GROUP BY shop_id
     ) l ON l.shop_id = s.id
     WHERE s.status = 'published'
     ORDER BY s.created_at DESC`
  );
  return rows;
}

export async function insertChatMessage({ shopId, tableId, userId, authorName, text }) {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (shop_id, table_id, user_id, author_name, text)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, shop_id, table_id, author_name, text, created_at`,
    [shopId, tableId || null, userId || null, authorName, text]
  );
  return rows[0];
}

const HISTORY_LIMIT = 50;

export async function recentShopMessages(shopId, limit = HISTORY_LIMIT) {
  const { rows } = await pool.query(
    `SELECT user_id, author_name, text, created_at FROM chat_messages
     WHERE shop_id = $1 AND table_id IS NULL
     ORDER BY created_at DESC
     LIMIT $2`,
    [shopId, limit]
  );
  return rows.reverse(); // oldest first, ready to render top-to-bottom
}

export async function recentTableMessages(shopId, tableId, limit = HISTORY_LIMIT) {
  const { rows } = await pool.query(
    `SELECT user_id, author_name, text, created_at FROM chat_messages
     WHERE shop_id = $1 AND table_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [shopId, tableId, limit]
  );
  return rows.reverse();
}
