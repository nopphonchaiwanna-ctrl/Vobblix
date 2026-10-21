// One way to tell a user something about an event: the in-site bell
// (notifications table + live socket push to their `user:<id>` room),
// plus a Web Push to their phone if they said yes to alerts for that
// event (services/push.js). Best effort - a failed notification never
// fails the action behind it.

import { createNotification, publicNotification } from "./db/notifications.js";
import { getPushService } from "./services/push.js";

export function createEventNotifier(io, push = getPushService()) {
  return async function notifyUser(userId, { kind, message, target, eventId = null }) {
    try {
      const n = await createNotification({ userId, kind, message, target });
      io.to(`user:${userId}`).emit("notification:new", publicNotification(n));
      await push.sendToUser(userId, { title: "VobbLiX", body: message, url: target }, { eventId });
    } catch (err) {
      console.error(`[events] failed to notify ${kind}`, err);
    }
  };
}
