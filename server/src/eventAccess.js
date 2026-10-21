// Who someone is to an event: its organizer (the shop's owner, or an
// admin), a judge, a player, or nobody - drives what the event routes
// let them do and what GET /events/:id shows them.

import { getShopById } from "./db/shops.js";
import { isJudge } from "./db/judging.js";
import { getPlayerByEventAndUser } from "./db/tournaments.js";

export async function eventRole(event, auth) {
  const shop = await getShopById(event.shop_id);
  if (auth.role === "admin" || shop?.owner_user_id === auth.userId) return "organizer";
  if (await isJudge(event.id, auth.userId)) return "judge";
  const player = await getPlayerByEventAndUser(event.id, auth.userId);
  if (player && !player.dropped) return "player";
  return "none";
}

/** Organizer or judge - else a 403 is sent and null returned. */
export async function requireEventStaff(req, res, event) {
  const role = await eventRole(event, req.auth);
  if (role !== "organizer" && role !== "judge") {
    res.status(403).json({ error: "Only this event's organizer and judges can do that." });
    return null;
  }
  return role;
}
