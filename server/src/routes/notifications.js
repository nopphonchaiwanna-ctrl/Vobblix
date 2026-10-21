// The topbar bell's persisted list (see db/notifications.js).
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listNotifications, markAllNotificationsRead, publicNotification } from "../db/notifications.js";
import { getPushService, pushStore, isAllowedPushEndpoint } from "../services/push.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const rows = await listNotifications(req.auth.userId);
    res.json({ notifications: rows.map(publicNotification) });
  } catch (err) {
    next(err);
  }
});

// Opening the bell marks everything read (same behavior the client
// already had locally) - this makes it stick across reloads/devices.
notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    await markAllNotificationsRead(req.auth.userId);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Web Push (event alerts) ----------

// The VAPID public key the browser subscribes with - null when push
// isn't configured on this server (the client then never asks).
notificationsRouter.get("/push-key", (req, res) => {
  res.json({ publicKey: getPushService().publicKey });
});

notificationsRouter.post("/push-subscriptions", async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    const keys = req.body?.keys;
    if (typeof endpoint !== "string" || endpoint.length > 1000 || !isAllowedPushEndpoint(endpoint) || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: "Invalid push subscription." });
    }
    await pushStore.saveSubscription(req.auth.userId, { endpoint, keys: { p256dh: String(keys.p256dh), auth: String(keys.auth) } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
