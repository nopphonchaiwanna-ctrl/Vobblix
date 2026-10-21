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
import { penaltyOutcome } from "../tournament/penalties.js";
import { refreshEventTables } from "../eventTables.js";

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

export function publicPenalty(p) {
  return {
    id: p.id,
    playerId: p.player_id,
    playerName: p.player_name ?? null,
    matchId: p.match_id,
    level: p.level,
    reason: p.reason,
    status: p.status,
    issuedByName: p.issued_by_name ?? null,
    createdAt: p.created_at,
  };
}

const LEVEL_LABEL = { warning: "a warning", match_loss: "a match loss", disqualification: "a disqualification" };

function isCurrentRoundMatch(event, match) {
  return RUNNING.includes(event.status) && match.phase === event.current_phase && match.round_number === event.current_round;
}

/**
 * The effect of a confirmed match loss / DQ - results only ever change
 * for the current round. Returns the waitlister who got a DQ'd player's
 * spot (before the start), if any.
 */
async function applyPenalty(event, penalty, decidedBy) {
  const lossFor = async (match, playerId) => {
    if (!match || !match.player2_id || !isCurrentRoundMatch(event, match)) return;
    await db.overrideMatchResult(match.id, decidedBy, match.player1_id === playerId ? "player2_win" : "player1_win");
  };
  if (penalty.level === "match_loss") {
    await lossFor(await db.getMatchById(penalty.match_id), penalty.player_id);
    return null;
  }
  if (penalty.level === "disqualification") {
    const { promoted } = await db.dropAndPromote(penalty.player_id);
    const current = await db.getMatchesForRound(event.id, event.current_phase, event.current_round);
    const theirs = current.find((m) => !m.result && (m.player1_id === penalty.player_id || m.player2_id === penalty.player_id));
    await lossFor(theirs, penalty.player_id);
    return promoted;
  }
  return null;
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
      // Judges speak at every match table - tell tables already in a call.
      await refreshEventTables(io, event.shop_id);
      await notifyUser(userId, {
        eventId: event.id, kind: "event_judge_added",
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
      await refreshEventTables(io, event.shop_id);
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
      if (!isCurrentRoundMatch(event, match) || match.result) {
        return res.status(409).json({ error: "This match isn't being played right now." });
      }

      const last = await judging.lastCallBy(match.id, req.auth.userId);
      const waitMs = last ? RECALL_COOLDOWN_MS - last.age_ms : 0;
      if (waitMs > 0) {
        return res.status(429).json({ error: "A judge is on the way - you can call again shortly.", retryAfterSeconds: Math.ceil(waitMs / 1000) });
      }

      const call = await judging.createJudgeCall(event.id, match.id, req.auth.userId, RECALL_COOLDOWN_MS);
      if (!call) {
        return res.status(429).json({ error: "A judge is on the way - you can call again shortly.", retryAfterSeconds: Math.ceil(RECALL_COOLDOWN_MS / 1000) });
      }
      const shop = await getShopById(event.shop_id);
      const staff = [shop?.owner_user_id, ...(await judging.listJudges(event.id)).map((j) => j.user_id)].filter(Boolean);
      const table = match.table_number ? `Table ${match.table_number}${match.table_online ? " (online)" : ""}` : "A match";
      await Promise.all(
        [...new Set(staff)].map(async (userId) => {
          await notifyUser(userId, {
            eventId: event.id, kind: "judge_call",
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

  // ---------- Penalties ----------

  // After a confirmed penalty: a DQ frees a spot (tell whoever got it)
  // and takes the player's voice at their table (refresh the lock).
  async function afterPenalty(event, penalty, decidedBy) {
    const promoted = await applyPenalty(event, penalty, decidedBy);
    if (promoted) {
      await notifyUser(promoted.user_id, {
        eventId: event.id,
        kind: "event_promoted",
        message: `You're in "${event.name}" - a spot opened up.`,
        target: `/events/${event.id}`,
      });
    }
    if (penalty.level === "disqualification") await refreshEventTables(io, event.shop_id);
  }

  router.post("/:id/penalties", async (req, res, next) => {
    try {
      const event = await loadEvent(req, res);
      if (!event) return;
      const role = await requireEventStaff(req, res, event);
      if (!role) return;
      const { playerId, matchId = null, level } = req.body || {};
      const reason = String(req.body?.reason || "").trim();
      if (!reason || reason.length > 300) return res.status(400).json({ error: "Give a reason (up to 300 characters)." });
      const player = await db.getPlayerById(playerId);
      if (!player || player.event_id !== event.id) return res.status(404).json({ error: "Player not found in this event." });
      const match = matchId ? await db.getMatchById(matchId) : null;
      if (matchId && (!match || match.event_id !== event.id)) return res.status(404).json({ error: "Match not found." });
      if (match && match.player1_id !== player.id && match.player2_id !== player.id) {
        return res.status(400).json({ error: "That player isn't in this match." });
      }
      const outcome = penaltyOutcome({ level, issuerRole: role, matchIsCurrentRound: !!match && isCurrentRoundMatch(event, match) });
      if (!outcome.allowed) return res.status(400).json({ error: outcome.reason });

      const penalty = await judging.createPenalty({
        eventId: event.id, playerId: player.id, matchId, level, reason, issuedBy: req.auth.userId, status: outcome.status,
      });
      if (penalty.status === "confirmed") await afterPenalty(event, penalty, req.auth.userId);
      await notifyUser(player.user_id, {
        eventId: event.id, kind: "event_penalty",
        message: `${event.name}: you received ${LEVEL_LABEL[level]}${penalty.status === "pending" ? " (pending the organizer)" : ""} - ${reason}`,
        target: `/events/${event.id}`,
      });
      res.status(201).json({ penalty: publicPenalty(penalty) });
    } catch (err) {
      if (err.code === "22P02") return res.status(404).json({ error: "Not found." });
      next(err);
    }
  });

  for (const [action, status] of [["confirm", "confirmed"], ["reject", "rejected"]]) {
    router.post(`/:id/penalties/:penaltyId/${action}`, async (req, res, next) => {
      try {
        const event = await loadEvent(req, res);
        if (!event || !(await requireOrganizer(req, res, event))) return;
        const existing = await judging.getPenalty(req.params.penaltyId);
        if (!existing || existing.event_id !== event.id) return res.status(404).json({ error: "Penalty not found." });
        if (status === "confirmed" && existing.level === "match_loss") {
          const match = await db.getMatchById(existing.match_id);
          if (!match || !isCurrentRoundMatch(event, match)) {
            return res.status(409).json({ error: "That round is over - this match loss can't be applied any more." });
          }
        }
        const decided = await judging.decidePenalty(existing.id, status, req.auth.userId);
        if (!decided) return res.status(409).json({ error: "This penalty was already decided." });
        if (status === "confirmed") await afterPenalty(event, decided, req.auth.userId);
        res.json({ penalty: publicPenalty(decided) });
      } catch (err) {
        next(err);
      }
    });
  }

  return router;
}
