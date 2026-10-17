// The topbar bell's persisted list (see db/notifications.js).
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { listNotifications, markAllNotificationsRead, publicNotification } from "../db/notifications.js";

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
