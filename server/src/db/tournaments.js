// Raw-pg query layer for the tournament/event system (see migration
// 006 + the project doc's "Planned: tournament/event system"). Mirrors
// the style of db/shops.js - plain snake_case rows out, no ORM.

import { pool } from "./pool.js";

// ---------- Events ----------

export async function createEvent({
  shopId,
  name,
  format,
  configuredCutSize,
  drawRule,
  maxPlayers,
  roundTimeLimitMinutes,
  createdBy,
}) {
  const { rows } = await pool.query(
    `INSERT INTO tournament_events
       (shop_id, name, format, configured_cut_size, draw_rule, max_players, round_time_limit_minutes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [shopId, name, format, configuredCutSize ?? null, drawRule, maxPlayers ?? null, roundTimeLimitMinutes ?? null, createdBy]
  );
  return rows[0];
}

export async function getEventById(id) {
  const { rows } = await pool.query("SELECT * FROM tournament_events WHERE id = $1", [id]);
  return rows[0] || null;
}

export async function listEventsForShop(shopId) {
  const { rows } = await pool.query(
    "SELECT * FROM tournament_events WHERE shop_id = $1 ORDER BY created_at DESC",
    [shopId]
  );
  return rows;
}

export async function startEvent(eventId, { roundCount, cutEnabled, effectiveCutSize }) {
  const { rows } = await pool.query(
    `UPDATE tournament_events
     SET status = 'swiss', current_phase = 'swiss', current_round = 1,
         round_count = $2, cut_enabled = $3, effective_cut_size = $4, started_at = now()
     WHERE id = $1
     RETURNING *`,
    [eventId, roundCount, cutEnabled, effectiveCutSize ?? null]
  );
  return rows[0] || null;
}

export async function advanceToSwissRound(eventId, roundNumber) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET current_round = $2 WHERE id = $1 RETURNING *`,
    [eventId, roundNumber]
  );
  return rows[0] || null;
}

export async function startBracketPhase(eventId, effectiveCutSize) {
  const { rows } = await pool.query(
    `UPDATE tournament_events
     SET status = 'bracket', current_phase = 'bracket', current_round = 1, effective_cut_size = $2
     WHERE id = $1
     RETURNING *`,
    [eventId, effectiveCutSize]
  );
  return rows[0] || null;
}

export async function advanceToBracketRound(eventId, roundNumber) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET current_round = $2 WHERE id = $1 RETURNING *`,
    [eventId, roundNumber]
  );
  return rows[0] || null;
}

export async function completeEvent(eventId) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET status = 'completed', completed_at = now() WHERE id = $1 RETURNING *`,
    [eventId]
  );
  return rows[0] || null;
}

export async function cancelEvent(eventId) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET status = 'cancelled' WHERE id = $1 RETURNING *`,
    [eventId]
  );
  return rows[0] || null;
}

// ---------- Players ----------

/**
 * Registers a player, or - if they'd previously dropped from this same
 * event - re-registers them in place (clearing `dropped`) instead of
 * hitting the (event_id, user_id) unique index. If a row already
 * exists and isn't dropped, this is a genuine double-registration: the
 * UPDATE's WHERE clause skips it, nothing comes back, and the caller
 * gets an ALREADY_REGISTERED error to turn into a 409.
 */
export async function registerPlayer(eventId, userId) {
  const { rows } = await pool.query(
    `INSERT INTO tournament_players (event_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT (event_id, user_id) DO UPDATE
       SET dropped = false, registered_at = now()
       WHERE tournament_players.dropped = true
     RETURNING *`,
    [eventId, userId]
  );
  if (rows[0]) return rows[0];
  const err = new Error("You're already registered for this event.");
  err.code = "ALREADY_REGISTERED";
  throw err;
}

/** Active (non-dropped) registration count, for enforcing `max_players`. */
export async function countActivePlayers(eventId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tournament_players WHERE event_id = $1 AND dropped = false`,
    [eventId]
  );
  return rows[0].count;
}

export async function getPlayersForEvent(eventId) {
  const { rows } = await pool.query(
    `SELECT tp.*, u.display_name
     FROM tournament_players tp
     JOIN users u ON u.id = tp.user_id
     WHERE tp.event_id = $1
     ORDER BY tp.registered_at ASC`,
    [eventId]
  );
  return rows;
}

export async function getPlayerByEventAndUser(eventId, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM tournament_players WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );
  return rows[0] || null;
}

export async function getPlayerById(playerId) {
  const { rows } = await pool.query(`SELECT * FROM tournament_players WHERE id = $1`, [playerId]);
  return rows[0] || null;
}

export async function dropPlayer(playerId) {
  const { rows } = await pool.query(
    `UPDATE tournament_players SET dropped = true WHERE id = $1 RETURNING *`,
    [playerId]
  );
  return rows[0] || null;
}

export async function markPlayersHadBye(playerIds) {
  if (playerIds.length === 0) return;
  await pool.query(`UPDATE tournament_players SET had_bye = true WHERE id = ANY($1::uuid[])`, [playerIds]);
}

export async function setPlayerFinalPlacement(playerId, { finalRank, finalLabel }) {
  const { rows } = await pool.query(
    `UPDATE tournament_players SET final_rank = $2, final_label = $3 WHERE id = $1 RETURNING *`,
    [playerId, finalRank, finalLabel ?? null]
  );
  return rows[0] || null;
}

// ---------- Matches ----------

/**
 * Bulk-inserts one round's pairings. A pairing with player2Id = null is
 * a bye and is inserted with result already set to 'bye' and
 * confirmed_at = now() (nothing for anyone to report).
 */
export async function insertRoundMatches(eventId, phase, roundNumber, pairings) {
  const inserted = [];
  for (const { player1Id, player2Id } of pairings) {
    const isBye = !player2Id;
    const { rows } = await pool.query(
      `INSERT INTO tournament_matches (event_id, phase, round_number, player1_id, player2_id, result, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [eventId, phase, roundNumber, player1Id, player2Id ?? null, isBye ? "bye" : null, isBye ? new Date() : null]
    );
    inserted.push(rows[0]);
  }
  return inserted;
}

export async function getMatchesForRound(eventId, phase, roundNumber) {
  const { rows } = await pool.query(
    `SELECT * FROM tournament_matches WHERE event_id = $1 AND phase = $2 AND round_number = $3 ORDER BY created_at ASC`,
    [eventId, phase, roundNumber]
  );
  return rows;
}

export async function getAllMatchesForEvent(eventId, phase = null) {
  const { rows } = phase
    ? await pool.query(
        `SELECT * FROM tournament_matches WHERE event_id = $1 AND phase = $2 ORDER BY round_number ASC, created_at ASC`,
        [eventId, phase]
      )
    : await pool.query(
        `SELECT * FROM tournament_matches WHERE event_id = $1 ORDER BY round_number ASC, created_at ASC`,
        [eventId]
      );
  return rows;
}

export async function getMatchById(matchId) {
  const { rows } = await pool.query(`SELECT * FROM tournament_matches WHERE id = $1`, [matchId]);
  return rows[0] || null;
}

/**
 * Records one player's claim for a match. If both players have now
 * claimed the same result, finalizes it (`result` + `confirmed_at`) in
 * the same round trip. Returns the updated match row either way.
 */
export async function submitMatchClaim(matchId, playerSide, claim) {
  const column = playerSide === "player1" ? "player1_claim" : "player2_claim";
  const { rows } = await pool.query(
    `UPDATE tournament_matches SET ${column} = $2 WHERE id = $1 RETURNING *`,
    [matchId, claim]
  );
  const match = rows[0];
  if (!match) return null;

  if (match.player1_claim && match.player1_claim === match.player2_claim) {
    const { rows: finalized } = await pool.query(
      `UPDATE tournament_matches SET result = $2, confirmed_at = now() WHERE id = $1 RETURNING *`,
      [matchId, match.player1_claim]
    );
    return finalized[0];
  }
  return match;
}

export async function overrideMatchResult(matchId, adminUserId, result) {
  const { rows } = await pool.query(
    `UPDATE tournament_matches
     SET result = $2, confirmed_at = now(), admin_override_by = $3
     WHERE id = $1
     RETURNING *`,
    [matchId, result, adminUserId]
  );
  return rows[0] || null;
}
