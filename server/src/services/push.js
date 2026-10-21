// Web Push (event-day design §2.4): alerts that reach a phone even with
// the site closed. Only sent for an event the user said yes to
// (event_push_consent), only if VAPID keys are configured - without
// them everything still works, there's just no push (the in-site bell
// still gets every notification).

import webpush from "web-push";
import { pool } from "../db/pool.js";

export function createPushService({ vapid, store, sender = webpush.sendNotification.bind(webpush) }) {
  const enabled = !!(vapid?.publicKey && vapid?.privateKey && vapid?.subject);

  async function sendToUser(userId, { title, body, url }, { eventId = null } = {}) {
    if (!enabled) return;
    try {
      if (eventId && !(await store.hasConsent(eventId, userId))) return;
      const subs = await store.listSubscriptions(userId);
      const payload = JSON.stringify({ title, body, url });
      await Promise.all(
        subs.map(async (s) => {
          try {
            await sender({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
              vapidDetails: { subject: vapid.subject, publicKey: vapid.publicKey, privateKey: vapid.privateKey },
              TTL: 60 * 60,
            });
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) await store.deleteSubscription(s.endpoint);
            else console.error("[push] send failed", err.statusCode || err.message);
          }
        })
      );
    } catch (err) {
      console.error("[push] failed", err);
    }
  }

  return { enabled, publicKey: enabled ? vapid.publicKey : null, sendToUser };
}

// ---------- Postgres store + the app-wide instance ----------

export const pushStore = {
  async listSubscriptions(userId) {
    const { rows } = await pool.query(`SELECT * FROM push_subscriptions WHERE user_id = $1`, [userId]);
    return rows;
  },
  async deleteSubscription(endpoint) {
    await pool.query(`DELETE FROM push_subscriptions WHERE endpoint = $1`, [endpoint]);
  },
  async hasConsent(eventId, userId) {
    const { rows } = await pool.query(`SELECT granted FROM event_push_consent WHERE event_id = $1 AND user_id = $2`, [eventId, userId]);
    return !!rows[0]?.granted;
  },
  async saveSubscription(userId, { endpoint, keys }) {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );
  },
  async setConsent(eventId, userId, granted) {
    await pool.query(
      `INSERT INTO event_push_consent (event_id, user_id, granted) VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO UPDATE SET granted = $3, decided_at = now()`,
      [eventId, userId, granted]
    );
  },
  async getConsent(eventId, userId) {
    const { rows } = await pool.query(`SELECT granted FROM event_push_consent WHERE event_id = $1 AND user_id = $2`, [eventId, userId]);
    return rows[0] ? rows[0].granted : null;
  },
};

let instance = null;
/** The app's push service, configured from VAPID_* env vars on first use. */
export function getPushService() {
  if (!instance) {
    instance = createPushService({
      vapid: {
        publicKey: process.env.VAPID_PUBLIC_KEY || "",
        privateKey: process.env.VAPID_PRIVATE_KEY || "",
        subject: process.env.VAPID_SUBJECT || "",
      },
      store: pushStore,
    });
  }
  return instance;
}
