// Event staff (event-day design §2.7): judges, "call a judge" from a
// match, and penalties. Mounted next to routes/tournaments.js under
// /events. Judges never override results - that stays the organizer's.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as db from "../db/tournaments.js";
import * as judging from "../db/judging.js";
import { getShopById } from "../db/shops.js";
import { searchUsersByName } from "../db/users.js";
import { eventRole, requireEventStaff } from "../eventAccess.js";
import { createEventNotifier } from "../eventNotify.js";

const RECALL_COOLDOWN_MS = 60 * 1000;
const RUNNING = ["swiss", "bracket"];

async function loadEvent(req, res) {
  const event = await db.getEventById(req.params.id);
  if (!event) res.status(404).json({ error: "Event not found." });
  return event;
}

export function publicJudgeCall(c) {
  return {
    id: c.id,
    matchId: c.match_id,
    status: c.status,
    tableNumber: c.table_number,
    tableOnline: c.table_online,
    calledBy: c.called_by_name ?? null,
    claimedBy: c.claimed_by,
    claimedByName: c.claimed_by_name ?? null,
    createdAt: c.created_at,
  };
}

export function createJudgingRouter(io) {
  const router = Router();
  router.use(requireAuth);
  const notifyUser = createEventNotifier(io);

  async function requireOrganizer(req, res, event) {
    if ((await eventRole(event, req.auth)) !== "organizer") {
      res.status(403).json({ error: "Only this event's organizer can do that." });
      return false;
    }
    return true;
  }

  // ---------- Judges ----------

  router.get("/:id/staff/search", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event || !(await requireOrganizer(req, res, event))) return;
      const q = String(req.query.q || "").trim();
      if (q.length < 2) return res.status(400).json({ error: "Type at least 2 letters." });
      const escaped = q.replace(/[%_\\]/g, "\\$&");
      const users = await searchUsersByName(escaped, 10);
      res.json({ users: users.map((u) => ({ id: u.id, displayName: u.display_name })) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/judges", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event || !(await requireOrganizer(req, res, event))) return;
      const userId = req.body?.userId;
      const player = userId ? await db.getPlayerByEventAndUser(event.id, userId) : null;
      if (player && !player.dropped) return res.status(409).json({ error: "Players in this event can't judge it." });
      await judging.addJudge(event.id, userId, req.auth.userId);
      await notifyUser(userId, {
        kind: "event_judge_added",
        message: `You're a judge for "${event.name}".`,
        target: `/events/${event.id}`,
      });
      res.json({ judges: (await judging.listJudges(event.id)).map((j) => ({ userId: j.user_id, displayName: j.display_name })) });
    } catch (err) {
      if (err.code === "23503" || err.code === "22P02") return res.status(404).json({ error: "User not found." });
      next(err);
    }
  });

  router.delete("/:id/judges/:userId", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event || !(await requireOrganizer(req, res, event))) return;
      await judging.removeJudge(event.id, req.params.userId);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Judge calls ----------

  router.post("/:id/matches/:matchId/call-judge", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event) return;
      const match = await db.getMatchById(req.params.matchId);
      if (!match || match.event_id !== event.id) return res.status(404).json({ error: "Match not found." });
      const [p1, p2] = await Promise.all([db.getPlayerById(match.player1_id), match.player2_id ? db.getPlayerById(match.player2_id) : null]);
      if (![p1?.user_id, p2?.user_id].includes(req.auth.userId)) {
        return res.status(403).json({ error: "Only the players in this match can call a judge." });
      }
      const current = RUNNING.includes(event.status) && match.phase === event.current_phase && match.round_number === event.current_round;
      if (!current) return res.status(409).json({ error: "This match isn't being played right now." });

      const last = await judging.lastCallBy(match.id, req.auth.userId);
      const waitMs = last ? RECALL_COOLDOWN_MS - (Date.now() - new Date(last.created_at).getTime()) : 0;
      if (waitMs > 0) {
        return res.status(429).json({ error: "A judge is on the way - you can call again shortly.", retryAfterSeconds: Math.ceil(waitMs / 1000) });
      }

      const call = await judging.createJudgeCall(event.id, match.id, req.auth.userId);
      const shop = await getShopById(event.shop_id);
      const staff = [shop?.owner_user_id, ...(await judging.listJudges(event.id)).map((j) => j.user_id)].filter(Boolean);
      const table = match.table_number ? `Table ${match.table_number}${match.table_online ? " (online)" : ""}` : "A match";
      await Promise.all(
        [...new Set(staff)].map(async (userId) => {
          await notifyUser(userId, {
            kind: "judge_call",
            message: `${table} needs a judge - ${event.name}`,
            target: `/events/${event.id}?call=${call.id}`,
          });
          io.to(`user:${userId}`).emit("judge-call:new", { eventId: event.id, callId: call.id, tableNumber: match.table_number });
        })
      );
      res.status(201).json({ call: publicJudgeCall({ ...call, table_number: match.table_number, table_online: match.table_online }) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/judge-calls/:callId/claim", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event || !(await requireEventStaff(req, res, event))) return;
      const existing = await judging.getJudgeCall(req.params.callId);
      if (!existing || existing.event_id !== event.id) return res.status(404).json({ error: "Call not found." });
      const claimed = await judging.claimJudgeCall(existing.id, req.auth.userId);
      if (!claimed) return res.status(409).json({ error: "Someone already took this call." });
      res.json({ call: publicJudgeCall(claimed) });
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/judge-calls/:callId/resolve", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event) return;
      const role = await requireEventStaff(req, res, event);
      if (!role) return;
      const existing = await judging.getJudgeCall(req.params.callId);
      if (!existing || existing.event_id !== event.id) return res.status(404).json({ error: "Call not found." });
      if (role !== "organizer" && existing.claimed_by !== req.auth.userId) {
        return res.status(403).json({ error: "Only the judge who took this call (or the organizer) can close it." });
      }
      const resolved = await judging.resolveJudgeCall(existing.id);
      if (!resolved) return res.status(409).json({ error: "This call is already closed." });
      res.json({ call: publicJudgeCall(resolved) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
