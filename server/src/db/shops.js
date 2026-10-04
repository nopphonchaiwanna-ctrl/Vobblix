// Postgres-backed shop metadata and chat history. Live-only state
// (who's connected right now, positions, current table) stays in
// rooms.js's in-memory map - it doesn't need to survive a restart.
//
// Two kinds of shop live in the same `shops` table (see migration 002):
//   - Ad-hoc shops: findOrCreateShop() below, the original "type any
//     code to get a room" flow. owner_user_id is always NULL for these.
//   - Owner-created marketplace shops: createOwnedShop() and friends,
//     reached only through the "become a shop owner" flow (see
//     routes/shops.js). These carry owner_user_id + a review status.

import { pool } from "./pool.js";

/**
 * Finds a shop by its join code, or creates it if this is the first time
 * anyone has joined that code. A shop's scene_type (and therefore its
 * table layout) is fixed at creation - see README's "Adding a new shop
 * or event". Never sets owner_user_id - an ad-hoc shop has no owner.
 */
export async function findOrCreateShop(code, { sceneType, name } = {}) {
  const existing = await pool.query("SELECT * FROM shops WHERE code = $1", [code]);
  if (existing.rows[0]) return existing.rows[0];

  // ON CONFLICT DO UPDATE (a no-op update) + RETURNING handles two
  // players opening a brand-new shop code at the same instant - whichever
  // insert loses the race still gets the winning row back instead of an
  // empty result.
  const inserted = await pool.query(
    `INSERT INTO shops (code, name, scene_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (code) DO UPDATE SET code = EXCLUDED.code
     RETURNING *`,
    [code, name || code, sceneType]
  );
  return inserted.rows[0];
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
    `INSERT INTO shops
       (code, name, scene_type, owner_user_id, status, layout_template_id, theme, logo_url, description)
     VALUES ($1, $2, 'owned', $3, 'pending_review', $4, $5, $6, $7)
     RETURNING *`,
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
    `UPDATE shops SET
       name = $1, description = $2, layout_template_id = $3, theme = $4, logo_url = $5,
       status = CASE WHEN $6 THEN 'pending_review' ELSE status END,
       rejection_reason = CASE WHEN $6 THEN NULL ELSE rejection_reason END,
       reviewed_by = CASE WHEN $6 THEN NULL ELSE reviewed_by END,
       reviewed_at = CASE WHEN $6 THEN NULL ELSE reviewed_at END
     WHERE id = $7
     RETURNING *`,
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
    `UPDATE shops SET status = $1, reviewed_by = $2, reviewed_at = now(), rejection_reason = $3
     WHERE id = $4 AND owner_user_id IS NOT NULL
     RETURNING *`,
    [status, reviewedBy, rejectionReason || null, shopId]
  );
  return rows[0] || null;
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
     WHERE s.owner_user_id IS NOT NULL AND s.status = 'published'
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
