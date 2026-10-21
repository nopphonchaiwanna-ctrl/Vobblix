// Tournament/event API: Swiss rounds with an optional top-cut bracket
// (or Swiss-only). The actual pairing/standings/bracket math lives in
// src/tournament/swiss.js and src/tournament/bracket.js (pure, DB-free)
// - this file is just the HTTP + Postgres plumbing around them. See the
// project doc's "Planned: tournament/event system" for the full spec
// this was built from.

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getShopById } from "../db/shops.js";
import { userIdsInRoom } from "../rooms.js";
import { startingRoster } from "../tournament/entry.js";
import { assignTables } from "../tournament/tables.js";
import { resolveScene } from "../scenes/index.js";
import { refreshEventTables } from "../eventTables.js";
import { createEventNotifier } from "../eventNotify.js";
import { eventRole } from "../eventAccess.js";
import * as judging from "../db/judging.js";
import { publicJudgeCall, publicPenalty } from "./judging.js";
import * as db from "../db/tournaments.js";
import { createNotification, publicNotification } from "../db/notifications.js";
import {
  computeRoundCount,
  pairRound,
  pointsForResult,
  computeOpw,
  sortStandings,
} from "../tournament/swiss.js";
import {
  isValidCutSize,
  resolveCutEligibility,
  resolveCutRoster,
  generateBracketRound1,
  advanceBracketRound,
  totalBracketRounds,
  placementLabel,
} from "../tournament/bracket.js";


const VALID_MAX_PLAYERS = [4, 8, 16, 32, 64];
const MAX_ROUND_TIME_LIMIT_MINUTES = 2880; // 2 days
// Card games this platform knows how to run an event for. Vanguard is
// the first one - more get appended here (and to the client's
// create-event dropdown, see eventsPanel.js's GAME_LABELS) as support
// for them is built, same pattern as everything else in migration 009.
const VALID_GAMES = ["vanguard"];
const REGISTRATION_MODES = ["first_come", "lottery"];
const VANGUARD_REGIONS = ["th", "jp"];
const VANGUARD_REGULATIONS = ["premium", "d_standard"];

// ---------- Shared helpers ----------

// Statuses where rounds are being played - results can be reported,
// overridden and advanced only then.
const RUNNING_STATUSES = ["swiss", "bracket"];

/**
 * Who is actually playing: holds a spot, showed up (or the event
 * predates check-in), and hasn't dropped. Waitlisters who never got in
 * and no-shows stay on the event's player list but never pair or rank.
 */
function isCompeting(p) {
  return p.entry_status === "entered" && !p.no_show && !p.dropped;
}

/**
 * Validates an event's settings from a request body - shared by create
 * and edit so the two can't drift apart. Returns { error } or { fields }.
 */
function parseEventSettings(body) {
  const name = (body?.name || "").trim().slice(0, 80);
  const game = body?.game;
  const format = body?.format === "swiss_cut" ? "swiss_cut" : "swiss_only";
  const drawRule = body?.drawRule === "draw" ? "draw" : "double_loss";
  const configuredCutSize = format === "swiss_cut" ? Number(body?.configuredCutSize) : null;
  const maxPlayers = Number(body?.maxPlayers);
  const roundTimeLimitMinutes = parseRoundTimeLimit(body?.roundTimeLimitMinutes);
  const registrationMode = body?.registrationMode ?? "first_come";
  // Region (TH/JP card pool) + regulation only mean something for
  // Vanguard; any other game stores null.
  const vanguardRegion = game === "vanguard" ? body?.vanguardRegion : null;
  const vanguardRegulation = game === "vanguard" ? body?.vanguardRegulation : null;

  if (!name) return { error: "Enter an event name." };
  if (!VALID_GAMES.includes(game)) return { error: "Choose a supported game." };
  if (!REGISTRATION_MODES.includes(registrationMode)) return { error: "Choose how players get in: first come or lottery." };
  if (game === "vanguard" && !VANGUARD_REGIONS.includes(vanguardRegion)) return { error: "Choose TH or JP for a Vanguard event." };
  if (game === "vanguard" && !VANGUARD_REGULATIONS.includes(vanguardRegulation)) {
    return { error: "Choose Premium or D-Standard for a Vanguard event." };
  }
  if (format === "swiss_cut" && !isValidCutSize(configuredCutSize)) {
    return { error: "Cut size must be one of 4, 8, 16, 32, 64." };
  }
  if (!VALID_MAX_PLAYERS.includes(maxPlayers)) {
    return { error: "Player limit must be one of 4, 8, 16, 32, 64." };
  }
  if (roundTimeLimitMinutes === undefined) return { error: ROUND_TIME_LIMIT_ERROR };
  return {
    fields: { name, game, format, configuredCutSize, drawRule, maxPlayers, roundTimeLimitMinutes, registrationMode, vanguardRegion, vanguardRegulation },
  };
}

const ROUND_TIME_LIMIT_ERROR = "Round time limit must be between 1 minute and 2 days (2880 minutes).";

/** null = no limit, undefined = invalid, otherwise whole minutes. */
function parseRoundTimeLimit(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const minutes = Number(raw);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_ROUND_TIME_LIMIT_MINUTES) return undefined;
  return minutes;
}

async function requireShopOwnerOrAdmin(req, res, shopId) {
  const shop = await getShopById(shopId);
  if (!shop) {
    res.status(404).json({ error: "Shop not found." });
    return null;
  }
  if (shop.owner_user_id !== req.auth.userId && req.auth.role !== "admin") {
    res.status(403).json({ error: "You don't own this shop." });
    return null;
  }
  return shop;
}

/** Loads the event + does the ownership/role check in one call. */
async function requireEventOwnerOrAdmin(req, res, eventId) {
  const event = await db.getEventById(eventId);
  if (!event) {
    res.status(404).json({ error: "Event not found." });
    return null;
  }
  const shop = await getShopById(event.shop_id);
  if (!shop || (shop.owner_user_id !== req.auth.userId && req.auth.role !== "admin")) {
    res.status(403).json({ error: "You don't own this event's shop." });
    return null;
  }
  return event;
}

function toMatchShape(row) {
  return {
    id: row.id,
    phase: row.phase,
    roundNumber: row.round_number,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    result: row.result,
  };
}

/**
 * Folds every finalized Swiss match into per-player points, win/loss/
 * draw records (for OPW), and the opponent list (for rematch
 * avoidance) - the one place all three derive from the same pass over
 * match history so they can't drift apart.
 */
function computeSwissStandings(players, matchRows, drawRule) {
  const matches = matchRows.map(toMatchShape);
  const points = new Map();
  const record = new Map(); // wins/losses/draws from real (non-bye) matches only
  const opponentIds = new Map();
  for (const p of players) {
    points.set(p.id, 0);
    record.set(p.id, { wins: 0, losses: 0, draws: 0 });
    opponentIds.set(p.id, []);
  }

  for (const m of matches) {
    if (!m.result) continue; // defensive - callers should only pass confirmed rounds
    if (m.result === "bye") {
      points.set(m.player1Id, (points.get(m.player1Id) ?? 0) + 3);
      continue;
    }
    if (!m.player2Id) continue;
    opponentIds.get(m.player1Id)?.push(m.player2Id);
    opponentIds.get(m.player2Id)?.push(m.player1Id);
    points.set(m.player1Id, (points.get(m.player1Id) ?? 0) + pointsForResult(m.result, "player1", drawRule));
    points.set(m.player2Id, (points.get(m.player2Id) ?? 0) + pointsForResult(m.result, "player2", drawRule));

    const r1 = record.get(m.player1Id);
    const r2 = record.get(m.player2Id);
    if (!r1 || !r2) continue;
    if (m.result === "player1_win") { r1.wins++; r2.losses++; }
    else if (m.result === "player2_win") { r2.wins++; r1.losses++; }
    else if (m.result === "draw") { r1.draws++; r2.draws++; }
    else if (m.result === "double_loss") { r1.losses++; r2.losses++; }
  }

  const standings = players.map((p) => ({
    id: p.id,
    userId: p.user_id,
    displayName: p.display_name,
    points: points.get(p.id) ?? 0,
    wins: record.get(p.id).wins,
    losses: record.get(p.id).losses,
    draws: record.get(p.id).draws,
    opw: computeOpw(p.id, matches, record),
    hadBye: p.had_bye,
    dropped: p.dropped,
  }));

  return { standings, opponentIdsByPlayer: opponentIds };
}

function publicEvent(event) {
  return {
    id: event.id,
    shopId: event.shop_id,
    name: event.name,
    game: event.game,
    format: event.format,
    configuredCutSize: event.configured_cut_size,
    effectiveCutSize: event.effective_cut_size,
    cutEnabled: event.cut_enabled,
    maxPlayers: event.max_players,
    roundTimeLimitMinutes: event.round_time_limit_minutes,
    drawRule: event.draw_rule,
    registrationMode: event.registration_mode,
    vanguardRegion: event.vanguard_region,
    vanguardRegulation: event.vanguard_regulation,
    lotteryDrawnAt: event.lottery_drawn_at,
    checkInOpenedAt: event.check_in_opened_at,
    status: event.status,
    currentPhase: event.current_phase,
    roundCount: event.round_count,
    currentRound: event.current_round,
    createdAt: event.created_at,
    startedAt: event.started_at,
    completedAt: event.completed_at,
  };
}

/**
 * Gives a round's pairings their table numbers: the shop's real tables
 * for the top pairs (by the two players' points), online tables after.
 */
async function withTables(event, pairings, pointsById = new Map()) {
  const shop = await getShopById(event.shop_id);
  const physical = shop ? resolveScene(shop).TABLES.length : 0;
  const seeded = pairings.map((p) => ({
    ...p,
    seedPoints: (pointsById.get(p.player1Id) ?? 0) + (pointsById.get(p.player2Id) ?? 0),
  }));
  return assignTables(seeded, physical);
}

/** A player's own penalties - none at all if they have no (active) entry. */
async function ownPenalties(eventId, playerRow) {
  return playerRow ? judging.listPenalties(eventId, playerRow.id) : [];
}

function publicPlayer(p) {
  return {
    id: p.id,
    userId: p.user_id,
    displayName: p.display_name,
    dropped: p.dropped,
    finalRank: p.final_rank,
    finalLabel: p.final_label,
    entryStatus: p.entry_status,
    waitlistPosition: p.waitlist_position,
    checkInRequestedAt: p.check_in_requested_at,
    checkedInAt: p.checked_in_at,
    noShow: p.no_show,
  };
}

function publicMatch(row) {
  return {
    id: row.id,
    phase: row.phase,
    roundNumber: row.round_number,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    player1Claim: row.player1_claim,
    player2Claim: row.player2_claim,
    result: row.result,
    confirmedAt: row.confirmed_at,
    tableNumber: row.table_number,
    tableOnline: row.table_online,
  };
}

// Takes `io` (same reason as routes/orders.js's createOrdersRouter) so
// cancelling an event can push a notification to every registered
// player, not just persist it.
export function createTournamentsRouter(io) {
  const tournamentsRouter = Router();

  // ---------- Create / list (owner, admin) ----------

  tournamentsRouter.use(requireAuth);

  const notifyUser = createEventNotifier(io);

  tournamentsRouter.post("/", requireRole("shop_owner", "admin"), async (req, res, next) => {
    try {
      const shopId = req.body?.shopId;
      const shop = await requireShopOwnerOrAdmin(req, res, shopId);
      if (!shop) return;

      const parsed = parseEventSettings(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });

      const event = await db.createEvent({ shopId, ...parsed.fields, createdBy: req.auth.userId });
      res.status(201).json({ event: publicEvent(event) });
    } catch (err) {
      next(err);
    }
  });

  tournamentsRouter.get("/by-shop/:shopId", async (req, res, next) => {
    try {
      const events = await db.listEventsForShop(req.params.shopId);
      res.json({ events: events.map(publicEvent) });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Event detail ----------

  tournamentsRouter.get("/:id", async (req, res, next) => {
    try {
      const event = await db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found." });

      const players = await db.getPlayersForEvent(event.id);
      const activePlayers = players.filter(isCompeting);
      const swissMatches = await db.getAllMatchesForEvent(event.id, "swiss");
      const { standings } = computeSwissStandings(activePlayers, swissMatches, event.draw_rule);
      const sorted = sortStandings(standings);

      const currentRoundMatches = await db.getMatchesForRound(event.id, event.current_phase, event.current_round || 1);
      // Every match in a round is inserted in the same insertRoundMatches()
      // call, so the earliest created_at among them is effectively "when
      // this round started" - no separate column needed. Purely for the
      // client's optional countdown display (round_time_limit_minutes);
      // nothing here auto-resolves a match when time's up.
      const currentRoundStartedAt = currentRoundMatches.reduce(
        (earliest, m) => (!earliest || m.created_at < earliest ? m.created_at : earliest),
        null
      );

      const myRole = await eventRole(event, req.auth);
      const staff = myRole === "organizer" || myRole === "judge";
      const judges = (await judging.listJudges(event.id)).map((j) => ({ userId: j.user_id, displayName: j.display_name }));

      res.json({
        event: publicEvent(event),
        myRole,
        judges,
        ...(staff ? { openJudgeCalls: (await judging.listActiveJudgeCalls(event.id)).map(publicJudgeCall) } : {}),
        // Staff see every penalty; a player only their own.
        penalties: (
          staff
            ? await judging.listPenalties(event.id)
            : await ownPenalties(event.id, players.find((p) => p.user_id === req.auth.userId && !p.dropped))
        ).map(publicPenalty),
        players: players.map(publicPlayer),
        standings: sorted,
        currentRoundMatches: currentRoundMatches.map(publicMatch),
        currentRoundStartedAt,
      });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Edit / cancel (owner, admin) ----------

  // While registration is open every setting can change (the player limit
  // can't drop below who's already in). Once rounds are running only the
  // name and round time limit can - format, cut and draw rule already
  // shaped the pairings and standings.
  tournamentsRouter.patch("/:id", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;

      if (event.status === "registration") {
        const parsed = parseEventSettings(req.body);
        if (parsed.error) return res.status(400).json({ error: parsed.error });
        const activeCount = await db.countEnteredPlayers(event.id);
        if (parsed.fields.maxPlayers < activeCount) {
          return res.status(409).json({ error: `${activeCount} players are already registered - the limit can't go below that.` });
        }
        const updated = await db.updateEventSettings(event.id, parsed.fields);
        if (!updated) return res.status(409).json({ error: "This event has just started - reload and try again." });
        return res.json({ event: publicEvent(updated) });
      }

      if (RUNNING_STATUSES.includes(event.status)) {
        const name = (req.body?.name || "").trim().slice(0, 80);
        const roundTimeLimitMinutes = parseRoundTimeLimit(req.body?.roundTimeLimitMinutes);
        if (!name) return res.status(400).json({ error: "Enter an event name." });
        if (roundTimeLimitMinutes === undefined) return res.status(400).json({ error: ROUND_TIME_LIMIT_ERROR });
        const updated = await db.updateEventBasics(event.id, { name, roundTimeLimitMinutes });
        if (!updated) return res.status(409).json({ error: "This event has just finished - reload and try again." });
        return res.json({ event: publicEvent(updated) });
      }

      res.status(409).json({ error: "A finished or cancelled event can't be edited." });
    } catch (err) {
      next(err);
    }
  });

  tournamentsRouter.post("/:id/cancel", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      const cancelled = await db.cancelEvent(event.id);
      if (!cancelled) return res.status(409).json({ error: "This event has already finished or been cancelled." });
      await refreshEventTables(io, event.shop_id);

      // Tell every active player (except whoever cancelled it). Persisted
      // first so an offline player sees it in their bell next login; the
      // cancel itself already succeeded, so a failure here is only logged.
      const players = await db.getPlayersForEvent(event.id);
      const recipients = players.filter((p) => !p.dropped && p.user_id !== req.auth.userId);
      await Promise.all(
        recipients.map(async (p) => {
          try {
            const n = await createNotification({
              userId: p.user_id,
              kind: "event_cancelled",
              message: `"${event.name}" was cancelled by the organizer.`,
              target: `/events/${event.id}`,
            });
            io.to(`user:${p.user_id}`).emit("notification:new", publicNotification(n));
          } catch (err) {
            console.error("[events] failed to notify player of cancellation", err);
          }
        })
      );

      res.json({ event: publicEvent(cancelled), notified: recipients.length });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Registration ----------

  tournamentsRouter.post("/:id/register", async (req, res, next) => {
    try {
      const event = await db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found." });
      // During check-in the field is set - newcomers can only join the waitlist.
      if (event.status !== "registration" && event.status !== "check_in") {
        return res.status(409).json({ error: "Registration is closed for this event." });
      }
      if (await judging.isJudge(event.id, req.auth.userId)) {
        return res.status(409).json({ error: "Judges can't play in this event." });
      }
      const player = await db.registerWithEntry(event.id, req.auth.userId);
      res.status(201).json({ player: publicPlayer(player) });
    } catch (err) {
      if (err.code === "ALREADY_REGISTERED" || err.code === "23505") {
        return res.status(409).json({ error: "You're already registered for this event." });
      }
      next(err);
    }
  });

  tournamentsRouter.post("/:id/draw", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (event.registration_mode !== "lottery") return res.status(400).json({ error: "This event isn't a lottery." });
      if (event.status !== "registration") return res.status(409).json({ error: "Registration is closed for this event." });
      const result = await db.runLottery(event.id);
      if (!result) return res.status(409).json({ error: "The draw has already been made." });
      const target = `/events/${event.id}`;
      await Promise.all([
        ...result.entered.map((userId) =>
          notifyUser(userId, { kind: "event_lottery_won", message: `You're in "${event.name}"!`, target })
        ),
        ...result.waitlisted.map((userId, i) =>
          notifyUser(userId, {
            kind: "event_lottery_waitlisted",
            message: `"${event.name}" is full - you're #${i + 1} on the waitlist.`,
            target,
          })
        ),
      ]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  tournamentsRouter.post("/:id/drop", async (req, res, next) => {
    try {
      const event = await db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found." });
      if (event.status === "completed" || event.status === "cancelled") {
        return res.status(409).json({ error: "This event is over." });
      }

      let player;
      if (req.body?.playerId) {
        // Dropping someone else requires owning the shop (or admin).
        if (!(await requireEventOwnerOrAdmin(req, res, event.id))) return;
        player = await db.getPlayerById(req.body.playerId);
      } else {
        player = await db.getPlayerByEventAndUser(event.id, req.auth.userId);
      }
      if (!player || player.event_id !== event.id) {
        return res.status(404).json({ error: "Player not found in this event." });
      }
      const { dropped, promoted } = await db.dropAndPromote(player.id);
      if (promoted) {
        await notifyUser(promoted.user_id, {
          kind: "event_promoted",
          message: `You're in "${event.name}" - a spot opened up.`,
          target: `/events/${event.id}`,
        });
      }
      res.json({ player: dropped });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Start (closes registration, generates round 1) ----------

  // ---------- Check-in (event day) ----------

  tournamentsRouter.post("/:id/check-in/open", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (event.registration_mode === "lottery" && !event.lottery_drawn_at) {
        return res.status(409).json({ error: "Run the draw before opening check-in." });
      }
      const opened = await db.openCheckIn(event.id);
      if (!opened) return res.status(409).json({ error: "Check-in can only open while registration is open." });
      res.json({ event: publicEvent(opened) });
    } catch (err) {
      next(err);
    }
  });

  tournamentsRouter.post("/:id/check-in", async (req, res, next) => {
    try {
      const event = await db.getEventById(req.params.id);
      if (!event) return res.status(404).json({ error: "Event not found." });
      if (event.status !== "check_in") return res.status(409).json({ error: "Check-in isn't open." });
      const player = await db.getPlayerByEventAndUser(event.id, req.auth.userId);
      if (!player || player.dropped) return res.status(404).json({ error: "You're not registered for this event." });
      if (player.entry_status === "pending_draw") return res.status(409).json({ error: "Wait for the draw." });
      res.json({ player: publicPlayer(await db.requestCheckIn(player.id)) });
    } catch (err) {
      next(err);
    }
  });

  tournamentsRouter.post("/:id/check-in/approve", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (event.status !== "check_in") return res.status(409).json({ error: "Check-in isn't open." });
      const player = await db.getPlayerById(req.body?.playerId);
      if (!player || player.event_id !== event.id) return res.status(404).json({ error: "Player not found in this event." });
      const approved = await db.approveCheckIn(player.id, req.auth.userId);
      if (!approved) return res.status(409).json({ error: "That player has dropped." });
      res.json({ player: publicPlayer(approved) });
    } catch (err) {
      next(err);
    }
  });

  // Everyone registered who is standing in this event's 3D shop right now.
  tournamentsRouter.post("/:id/check-in/auto", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (event.status !== "check_in") return res.status(409).json({ error: "Check-in isn't open." });
      const shop = await getShopById(event.shop_id);
      const present = [...userIdsInRoom(shop.code)];
      const approved = await db.approveCheckInForUsers(event.id, present, req.auth.userId);
      res.json({ approved });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Start (closes check-in, generates round 1) ----------

  tournamentsRouter.post("/:id/start", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (event.status === "registration") return res.status(409).json({ error: "Open check-in first." });
      if (event.status !== "check_in") {
        return res.status(409).json({ error: "This event has already been started." });
      }

      const all = (await db.getPlayersForEvent(event.id)).filter((p) => !p.dropped);
      const toRoster = (p) => ({ id: p.id, approved: !!p.checked_in_at, dropped: p.dropped, waitlistPosition: p.waitlist_position });
      const { starters, noShows } = startingRoster({
        entered: all.filter((p) => p.entry_status === "entered").map(toRoster),
        waitlisted: all.filter((p) => p.entry_status === "waitlisted").map(toRoster),
        maxPlayers: event.max_players,
      });
      if (starters.length < 2) {
        return res.status(400).json({ error: "Need at least 2 checked-in players to start." });
      }
      const starterSet = new Set(starters);
      const players = all.filter((p) => starterSet.has(p.id));

      const roundCount = computeRoundCount(players.length);
      const eligibility = resolveCutEligibility(event.format, players.length, event.configured_cut_size);

      // Guarded on status = 'check_in': of two starts at once, one wins
      // and the other stops here before any round is created.
      const updatedEvent = await db.startEvent(event.id, {
        roundCount,
        cutEnabled: eligibility.cutEnabled,
      });
      if (!updatedEvent) return res.status(409).json({ error: "This event has already been started." });
      await db.applyStartingRoster(event.id, { starterIds: starters, noShowIds: noShows });

      const pairingInput = players.map((p) => ({
        id: p.id,
        points: 0,
        opponentIds: [],
        hadBye: p.had_bye,
        dropped: false,
      }));
      const { pairings, byePlayerId } = pairRound(pairingInput);
      await db.insertRoundMatches(event.id, "swiss", 1, await withTables(event, pairings));
      if (byePlayerId) await db.markPlayersHadBye([byePlayerId]);

      await refreshEventTables(io, event.shop_id);
      res.json({
        event: publicEvent(updatedEvent),
        round1Pairings: pairings,
        cutFallbackMessage: eligibility.reason,
      });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Reporting results ----------

  tournamentsRouter.post("/:id/matches/:matchId/report", async (req, res, next) => {
    try {
      const match = await db.getMatchById(req.params.matchId);
      if (!match || match.event_id !== req.params.id) {
        return res.status(404).json({ error: "Match not found." });
      }
      if (match.result) {
        return res.status(409).json({ error: "This match's result is already final." });
      }
      const event = await db.getEventById(match.event_id);
      if (!RUNNING_STATUSES.includes(event?.status)) {
        return res.status(409).json({ error: "This event isn't running any more." });
      }

      const [player1, player2] = await Promise.all([
        db.getPlayerById(match.player1_id),
        match.player2_id ? db.getPlayerById(match.player2_id) : null,
      ]);
      let side;
      if (player1?.user_id === req.auth.userId) side = "player1";
      else if (player2?.user_id === req.auth.userId) side = "player2";
      else return res.status(403).json({ error: "You're not a player in this match." });

      const allowedClaims = match.phase === "bracket"
        ? ["player1_win", "player2_win"]
        : ["player1_win", "player2_win", "draw", "double_loss"];
      const claim = req.body?.claim;
      if (!allowedClaims.includes(claim)) {
        return res.status(400).json({ error: "Invalid result claim for this match." });
      }

      const updated = await db.submitMatchClaim(match.id, side, claim);
      res.json({ match: publicMatch(updated) });
    } catch (err) {
      next(err);
    }
  });

  tournamentsRouter.post("/:id/matches/:matchId/override", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (!RUNNING_STATUSES.includes(event.status)) {
        return res.status(409).json({ error: "This event isn't running any more." });
      }
      const match = await db.getMatchById(req.params.matchId);
      if (!match || match.event_id !== event.id) {
        return res.status(404).json({ error: "Match not found." });
      }
      const allowedResults = match.phase === "bracket"
        ? ["player1_win", "player2_win"]
        : ["player1_win", "player2_win", "draw", "double_loss"];
      if (!allowedResults.includes(req.body?.result)) {
        return res.status(400).json({ error: "Invalid result for this match." });
      }
      const updated = await db.overrideMatchResult(match.id, req.auth.userId, req.body.result);
      res.json({ match: publicMatch(updated) });
    } catch (err) {
      next(err);
    }
  });

  // ---------- Advance: next Swiss round, or the Swiss -> bracket -> done transitions ----------

  tournamentsRouter.post("/:id/advance", async (req, res, next) => {
    try {
      const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
      if (!event) return;
      if (!RUNNING_STATUSES.includes(event.status)) {
        return res.status(409).json({ error: "This event isn't running - nothing to advance." });
      }

      const currentMatches = await db.getMatchesForRound(event.id, event.current_phase, event.current_round);
      if (currentMatches.some((m) => !m.result)) {
        return res.status(409).json({ error: "Every match in the current round needs a confirmed result first." });
      }

      if (event.current_phase === "swiss") await advanceFromSwiss(event, res);
      else await advanceFromBracket(event, res);
      // Whatever came next (new round, top cut, done), the tables the
      // last round used are re-assigned or free now.
      await refreshEventTables(io, event.shop_id);
    } catch (err) {
      next(err);
    }
  });

  return tournamentsRouter;
}

async function advanceFromSwiss(event, res) {
  const players = (await db.getPlayersForEvent(event.id)).filter(isCompeting);
  const allSwissMatches = await db.getAllMatchesForEvent(event.id, "swiss");
  const { standings, opponentIdsByPlayer } = computeSwissStandings(players, allSwissMatches, event.draw_rule);

  if (event.current_round < event.round_count) {
    const nextRound = event.current_round + 1;
    const pairingInput = standings.map((s) => ({
      id: s.id,
      points: s.points,
      opponentIds: opponentIdsByPlayer.get(s.id) || [],
      hadBye: s.hadBye,
      dropped: false,
    }));
    const { pairings, byePlayerId } = pairRound(pairingInput);
    const pointsById = new Map(standings.map((s) => [s.id, s.points]));
    await db.insertRoundMatches(event.id, "swiss", nextRound, await withTables(event, pairings, pointsById));
    if (byePlayerId) await db.markPlayersHadBye([byePlayerId]);
    const updatedEvent = await db.advanceToSwissRound(event.id, nextRound);
    return res.json({ event: publicEvent(updatedEvent), nextRoundPairings: pairings });
  }

  // Swiss is done.
  const sorted = sortStandings(standings);
  if (!event.cut_enabled) {
    for (let i = 0; i < sorted.length; i++) {
      await db.setPlayerFinalPlacement(sorted[i].id, { finalRank: i + 1, finalLabel: null });
    }
    const completed = await db.completeEvent(event.id);
    return res.json({ event: publicEvent(completed), finalStandings: sorted });
  }

  // Everyone who started (incl. later drops) - not waitlisters or no-shows.
  const totalRegistered = (await db.getPlayersForEvent(event.id)).filter(
    (p) => p.entry_status === "entered" && !p.no_show
  ).length;
  const cutResult = resolveCutRoster(sorted, event.configured_cut_size, totalRegistered);
  const qualifiedIds = cutResult.qualified.map((p) => p.id);
  const pairings = generateBracketRound1(qualifiedIds, cutResult.cutSize);
  await db.insertRoundMatches(event.id, "bracket", 1, await withTables(event, pairings));
  const updatedEvent = await db.startBracketPhase(event.id, cutResult.cutSize);

  // Everyone who didn't make the cut is already locked into their
  // final rank, ranked below the whole cut, by Swiss standing.
  const nonQualifiedIds = new Set(sorted.map((p) => p.id));
  qualifiedIds.forEach((id) => nonQualifiedIds.delete(id));
  const nonQualified = sorted.filter((p) => nonQualifiedIds.has(p.id));
  for (let i = 0; i < nonQualified.length; i++) {
    await db.setPlayerFinalPlacement(nonQualified[i].id, {
      finalRank: cutResult.cutSize + 1 + i,
      finalLabel: null,
    });
  }

  return res.json({
    event: publicEvent(updatedEvent),
    bracketRound1Pairings: pairings,
    cutExpanded: cutResult.expanded,
    guaranteedTrimmed: cutResult.guaranteedTrimmed,
  });
}

async function advanceFromBracket(event, res) {
  const cutSize = event.effective_cut_size;
  const rounds = totalBracketRounds(cutSize);
  const currentMatches = (await db.getMatchesForRound(event.id, "bracket", event.current_round)).map(toMatchShape);

  // Everyone eliminated this round gets their placement locked in now.
  const startingRank = Math.floor(cutSize / Math.pow(2, event.current_round)) + 1;
  for (const m of currentMatches) {
    if (m.result === "bye") continue; // nobody lost a bye
    const loserId = m.result === "player1_win" ? m.player2Id : m.player1Id;
    const label = placementLabel(cutSize, event.current_round, false);
    await db.setPlayerFinalPlacement(loserId, { finalRank: startingRank, finalLabel: label });
  }

  if (event.current_round < rounds) {
    const nextPairings = advanceBracketRound(currentMatches);
    await db.insertRoundMatches(event.id, "bracket", event.current_round + 1, await withTables(event, nextPairings));
    const updatedEvent = await db.advanceToBracketRound(event.id, event.current_round + 1);
    return res.json({ event: publicEvent(updatedEvent), nextRoundPairings: nextPairings });
  }

  // That was the final - exactly one match, and its winner is the champion.
  const final = currentMatches[0];
  const championId = final.result === "player2_win" ? final.player2Id : final.player1Id;
  await db.setPlayerFinalPlacement(championId, { finalRank: 1, finalLabel: "champion" });

  const completed = await db.completeEvent(event.id);
  return res.json({ event: publicEvent(completed), championId });
}
