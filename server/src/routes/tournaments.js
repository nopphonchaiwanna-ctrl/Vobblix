// Tournament/event API: Swiss rounds with an optional top-cut bracket
// (or Swiss-only). The actual pairing/standings/bracket math lives in
// src/tournament/swiss.js and src/tournament/bracket.js (pure, DB-free)
// - this file is just the HTTP + Postgres plumbing around them. See the
// project doc's "Planned: tournament/event system" for the full spec
// this was built from.

import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getShopById } from "../db/shops.js";
import * as db from "../db/tournaments.js";
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

export const tournamentsRouter = Router();

const VALID_MAX_PLAYERS = [4, 8, 16, 32, 64];
const MAX_ROUND_TIME_LIMIT_MINUTES = 2880; // 2 days

// ---------- Shared helpers ----------

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
    format: event.format,
    configuredCutSize: event.configured_cut_size,
    effectiveCutSize: event.effective_cut_size,
    cutEnabled: event.cut_enabled,
    maxPlayers: event.max_players,
    roundTimeLimitMinutes: event.round_time_limit_minutes,
    drawRule: event.draw_rule,
    status: event.status,
    currentPhase: event.current_phase,
    roundCount: event.round_count,
    currentRound: event.current_round,
    createdAt: event.created_at,
    startedAt: event.started_at,
    completedAt: event.completed_at,
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
  };
}

// ---------- Create / list (owner, admin) ----------

tournamentsRouter.use(requireAuth);

tournamentsRouter.post("/", requireRole("shop_owner", "admin"), async (req, res, next) => {
  try {
    const shopId = req.body?.shopId;
    const shop = await requireShopOwnerOrAdmin(req, res, shopId);
    if (!shop) return;

    const name = (req.body?.name || "").trim().slice(0, 80);
    const format = req.body?.format === "swiss_cut" ? "swiss_cut" : "swiss_only";
    const drawRule = req.body?.drawRule === "draw" ? "draw" : "double_loss";
    const configuredCutSize = format === "swiss_cut" ? Number(req.body?.configuredCutSize) : null;
    const maxPlayers = Number(req.body?.maxPlayers);
    const roundTimeLimitRaw = req.body?.roundTimeLimitMinutes;
    const roundTimeLimitMinutes =
      roundTimeLimitRaw === null || roundTimeLimitRaw === undefined || roundTimeLimitRaw === ""
        ? null
        : Number(roundTimeLimitRaw);

    if (!name) return res.status(400).json({ error: "Enter an event name." });
    if (format === "swiss_cut" && !isValidCutSize(configuredCutSize)) {
      return res.status(400).json({ error: "Cut size must be one of 4, 8, 16, 32, 64." });
    }
    if (!VALID_MAX_PLAYERS.includes(maxPlayers)) {
      return res.status(400).json({ error: "Player limit must be one of 4, 8, 16, 32, 64." });
    }
    if (
      roundTimeLimitMinutes !== null &&
      (!Number.isInteger(roundTimeLimitMinutes) || roundTimeLimitMinutes < 1 || roundTimeLimitMinutes > MAX_ROUND_TIME_LIMIT_MINUTES)
    ) {
      return res.status(400).json({ error: "Round time limit must be between 1 minute and 2 days (2880 minutes)." });
    }

    const event = await db.createEvent({
      shopId,
      name,
      format,
      configuredCutSize,
      drawRule,
      maxPlayers,
      roundTimeLimitMinutes,
      createdBy: req.auth.userId,
    });
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
    const activePlayers = players.filter((p) => !p.dropped);
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

    res.json({
      event: publicEvent(event),
      players: players.map((p) => ({
        id: p.id,
        userId: p.user_id,
        displayName: p.display_name,
        dropped: p.dropped,
        finalRank: p.final_rank,
        finalLabel: p.final_label,
      })),
      standings: sorted,
      currentRoundMatches: currentRoundMatches.map(publicMatch),
      currentRoundStartedAt,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Registration ----------

tournamentsRouter.post("/:id/register", async (req, res, next) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });
    if (event.status !== "registration") {
      return res.status(409).json({ error: "Registration is closed for this event." });
    }
    if (event.max_players) {
      const activeCount = await db.countActivePlayers(event.id);
      const alreadyIn = await db.getPlayerByEventAndUser(event.id, req.auth.userId);
      // A previously-dropped player re-registering takes a new active
      // slot, so they're still subject to the cap; someone already
      // active isn't - they'll just hit ALREADY_REGISTERED below.
      if (activeCount >= event.max_players && !(alreadyIn && !alreadyIn.dropped)) {
        return res.status(409).json({ error: "This event is full." });
      }
    }
    const player = await db.registerPlayer(event.id, req.auth.userId);
    res.status(201).json({ player });
  } catch (err) {
    if (err.code === "ALREADY_REGISTERED" || err.code === "23505") {
      return res.status(409).json({ error: "You're already registered for this event." });
    }
    next(err);
  }
});

tournamentsRouter.post("/:id/drop", async (req, res, next) => {
  try {
    const event = await db.getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found." });

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
    const dropped = await db.dropPlayer(player.id);
    res.json({ player: dropped });
  } catch (err) {
    next(err);
  }
});

// ---------- Start (closes registration, generates round 1) ----------

tournamentsRouter.post("/:id/start", async (req, res, next) => {
  try {
    const event = await requireEventOwnerOrAdmin(req, res, req.params.id);
    if (!event) return;
    if (event.status !== "registration") {
      return res.status(409).json({ error: "This event has already been started." });
    }

    const players = (await db.getPlayersForEvent(event.id)).filter((p) => !p.dropped);
    if (players.length < 2) {
      return res.status(400).json({ error: "Need at least 2 registered players to start." });
    }

    const roundCount = computeRoundCount(players.length);
    const eligibility = resolveCutEligibility(event.format, players.length, event.configured_cut_size);

    const updatedEvent = await db.startEvent(event.id, {
      roundCount,
      cutEnabled: eligibility.cutEnabled,
    });

    const pairingInput = players.map((p) => ({
      id: p.id,
      points: 0,
      opponentIds: [],
      hadBye: p.had_bye,
      dropped: false,
    }));
    const { pairings, byePlayerId } = pairRound(pairingInput);
    await db.insertRoundMatches(event.id, "swiss", 1, pairings);
    if (byePlayerId) await db.markPlayersHadBye([byePlayerId]);

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

    const currentMatches = await db.getMatchesForRound(event.id, event.current_phase, event.current_round);
    if (currentMatches.some((m) => !m.result)) {
      return res.status(409).json({ error: "Every match in the current round needs a confirmed result first." });
    }

    if (event.current_phase === "swiss") {
      return await advanceFromSwiss(event, res);
    }
    return await advanceFromBracket(event, res);
  } catch (err) {
    next(err);
  }
});

async function advanceFromSwiss(event, res) {
  const players = (await db.getPlayersForEvent(event.id)).filter((p) => !p.dropped);
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
    await db.insertRoundMatches(event.id, "swiss", nextRound, pairings);
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

  const totalRegistered = (await db.getPlayersForEvent(event.id)).length;
  const cutResult = resolveCutRoster(sorted, event.configured_cut_size, totalRegistered);
  const qualifiedIds = cutResult.qualified.map((p) => p.id);
  const pairings = generateBracketRound1(qualifiedIds);
  await db.insertRoundMatches(event.id, "bracket", 1, pairings);
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
    const loserId = m.result === "player1_win" ? m.player2Id : m.player1Id;
    const label = placementLabel(cutSize, event.current_round, false);
    await db.setPlayerFinalPlacement(loserId, { finalRank: startingRank, finalLabel: label });
  }

  if (event.current_round < rounds) {
    const nextPairings = advanceBracketRound(currentMatches);
    await db.insertRoundMatches(event.id, "bracket", event.current_round + 1, nextPairings);
    const updatedEvent = await db.advanceToBracketRound(event.id, event.current_round + 1);
    return res.json({ event: publicEvent(updatedEvent), nextRoundPairings: nextPairings });
  }

  // That was the final - exactly one match, and its winner is the champion.
  const final = currentMatches[0];
  const championId = final.result === "player1_win" ? final.player1Id : final.player2Id;
  await db.setPlayerFinalPlacement(championId, { finalRank: 1, finalLabel: "champion" });

  const completed = await db.completeEvent(event.id);
  return res.json({ event: publicEvent(completed), championId });
}
