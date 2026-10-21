// One way to tell a user something about an event: the in-site bell
// (notifications table + live socket push to their `user:<id>` room).
// Best effort - a failed notification never fails the action behind it.

import { createNotification, publicNotification } from "./db/notifications.js";

export function createEventNotifier(io) {
  return async function notifyUser(userId, { kind, message, target }) {
    try {
      const n = await createNotification({ userId, kind, message, target });
      io.to(`user:${userId}`).emit("notification:new", publicNotification(n));
    } catch (err) {
      console.error(`[events] failed to notify ${kind}`, err);
    }
  };
}
