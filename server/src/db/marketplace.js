// Postgres access for the shop-owner application flow and the buy/sell
// marketplace (listings + order chat threads). Kept separate from
// db/shops.js (shop metadata/chat) since this is a distinct set of
// tables with its own lifecycle - see migration 002 and README's
// "Becoming a shop owner" / "Marketplace" sections.

import { pool } from "./pool.js";

// ---------- Shop-owner applications ----------

export async function createOwnerApplication(userId, message) {
  const { rows } = await pool.query(
    `INSERT INTO shop_owner_applications (user_id, message) VALUES ($1, $2) RETURNING *`,
    [userId, message || null]
  );
  return rows[0];
}

export async function latestApplicationForUser(userId) {
  const { rows } = await pool.query(
    `SELECT * FROM shop_owner_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function listApplicationsByStatus(status) {
  const { rows } = await pool.query(
    `SELECT a.*, u.display_name, u.email
     FROM shop_owner_applications a JOIN users u ON u.id = a.user_id
     WHERE a.status = $1 ORDER BY a.created_at ASC`,
    [status]
  );
  return rows;
}

export async function getApplicationById(id) {
  const { rows } = await pool.query("SELECT * FROM shop_owner_applications WHERE id = $1", [id]);
  return rows[0] || null;
}

/** Approves the application and promotes the applicant to shop_owner, in one transaction. */
export async function approveApplication(id, reviewedBy) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `UPDATE shop_owner_applications
       SET status = 'approved', reviewed_by = $1, reviewed_at = now(), rejection_reason = NULL
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [reviewedBy, id]
    );
    const application = rows[0];
    if (application) {
      await client.query(
        `UPDATE users SET role = 'shop_owner' WHERE id = $1 AND role = 'customer'`,
        [application.user_id]
      );
    }
    await client.query("COMMIT");
    return application || null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function rejectApplication(id, reviewedBy, reason) {
  const { rows } = await pool.query(
    `UPDATE shop_owner_applications
     SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), rejection_reason = $2
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [reviewedBy, reason || null, id]
  );
  return rows[0] || null;
}

// ---------- Listings ----------

export async function createListing(shopId, { title, description, priceCents, currency, photoUrl, stockQty }) {
  const { rows } = await pool.query(
    `INSERT INTO shop_listings (shop_id, title, description, price_cents, currency, photo_url, stock_qty)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [shopId, title, description || null, priceCents, currency || "THB", photoUrl || null, stockQty ?? null]
  );
  return rows[0];
}

export async function getListingById(id) {
  const { rows } = await pool.query("SELECT * FROM shop_listings WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function listListingsForShop(shopId, { activeOnly } = {}) {
  const sql = activeOnly
    ? `SELECT * FROM shop_listings WHERE shop_id = $1 AND status = 'active' ORDER BY created_at DESC`
    : `SELECT * FROM shop_listings WHERE shop_id = $1 ORDER BY created_at DESC`;
  const { rows } = await pool.query(sql, [shopId]);
  return rows;
}

/** Owner-scoped update; pass shopId so a listing can't be edited via a guessed id. */
export async function updateListing(listingId, shopId, fields) {
  const listing = await getListingById(listingId);
  if (!listing || listing.shop_id !== shopId) return null;

  const next = {
    title: fields.title ?? listing.title,
    description: fields.description ?? listing.description,
    price_cents: fields.priceCents ?? listing.price_cents,
    currency: fields.currency ?? listing.currency,
    photo_url: fields.photoUrl ?? listing.photo_url,
    stock_qty: fields.stockQty !== undefined ? fields.stockQty : listing.stock_qty,
    status: fields.status ?? listing.status,
  };
  const { rows } = await pool.query(
    `UPDATE shop_listings SET
       title = $1, description = $2, price_cents = $3, currency = $4,
       photo_url = $5, stock_qty = $6, status = $7, updated_at = now()
     WHERE id = $8
     RETURNING *`,
    [next.title, next.description, next.price_cents, next.currency, next.photo_url, next.stock_qty, next.status, listingId]
  );
  return rows[0];
}

// ---------- Orders (buy/sell inquiry threads) ----------

export async function createOrder({ listingId, shopId, buyerId, sellerId, quantity, priceCentsSnapshot }) {
  const { rows } = await pool.query(
    `INSERT INTO shop_orders (listing_id, shop_id, buyer_id, seller_id, quantity, price_cents_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [listingId, shopId, buyerId, sellerId, quantity, priceCentsSnapshot]
  );
  return rows[0];
}

export async function getOrderById(id) {
  const { rows } = await pool.query(
    `SELECT o.*, l.title AS listing_title, s.name AS shop_name, s.code AS shop_code
     FROM shop_orders o
     JOIN shop_listings l ON l.id = o.listing_id
     JOIN shops s ON s.id = o.shop_id
     WHERE o.id = $1`,
    [id]
  );
  return rows[0] || null;
}

export async function listOrdersForUser(userId) {
  const { rows } = await pool.query(
    `SELECT o.*, l.title AS listing_title, s.name AS shop_name,
            buyer.display_name AS buyer_name, seller.display_name AS seller_name
     FROM shop_orders o
     JOIN shop_listings l ON l.id = o.listing_id
     JOIN shops s ON s.id = o.shop_id
     JOIN users buyer ON buyer.id = o.buyer_id
     JOIN users seller ON seller.id = o.seller_id
     WHERE o.buyer_id = $1 OR o.seller_id = $1
     ORDER BY o.updated_at DESC`,
    [userId]
  );
  return rows;
}

const ORDER_TRANSITIONS = {
  buyer: { inquiry: ["cancelled"], confirmed: ["cancelled"] },
  seller: { inquiry: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"] },
};

/** Returns the updated order, or null if the transition isn't allowed for this actor. */
export async function setOrderStatus(orderId, actorRole, currentStatus, nextStatus) {
  const allowed = ORDER_TRANSITIONS[actorRole]?.[currentStatus] || [];
  if (!allowed.includes(nextStatus)) return null;
  const { rows } = await pool.query(
    `UPDATE shop_orders SET status = $1, updated_at = now() WHERE id = $2 AND status = $3 RETURNING *`,
    [nextStatus, orderId, currentStatus]
  );
  return rows[0] || null;
}

export async function insertOrderMessage({ orderId, senderId, authorName, text }) {
  const { rows } = await pool.query(
    `INSERT INTO shop_order_messages (order_id, sender_id, author_name, text)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [orderId, senderId || null, authorName, text]
  );
  return rows[0];
}

export async function listOrderMessages(orderId) {
  const { rows } = await pool.query(
    `SELECT * FROM shop_order_messages WHERE order_id = $1 ORDER BY created_at ASC`,
    [orderId]
  );
  return rows;
}
