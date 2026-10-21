// Raw-pg query layer for the tournament/event system (see migration
// 006 + the project doc's "Planned: tournament/event system"). Mirrors
// the style of db/shops.js - plain snake_case rows out, no ORM.

import { pool } from "./pool.js";
import { entryStatusOnRegister, drawLottery, nextFromWaitlist } from "../tournament/entry.js";

// ---------- Events ----------

export async function createEvent({
  shopId,
  name,
  game,
  format,
  configuredCutSize,
  drawRule,
  maxPlayers,
  roundTimeLimitMinutes,
  registrationMode = "first_come",
  vanguardRegion = null,
  vanguardRegulation = null,
  startsAt = null,
  createdBy,
}) {
  const { rows } = await pool.query(
    `INSERT INTO tournament_events
       (shop_id, name, game, format, configured_cut_size, draw_rule, max_players, round_time_limit_minutes,
        registration_mode, vanguard_region, vanguard_regulation, starts_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [shopId, name, game, format, configuredCutSize ?? null, drawRule, maxPlayers ?? null, roundTimeLimitMinutes ?? null,
      registrationMode, vanguardRegion, vanguardRegulation, startsAt, createdBy]
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
     WHERE id = $1 AND status = 'check_in'
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

/** Only an event that hasn't finished can be cancelled; null otherwise. */
export async function cancelEvent(eventId) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET status = 'cancelled'
     WHERE id = $1 AND status IN ('registration', 'swiss', 'bracket')
     RETURNING *`,
    [eventId]
  );
  return rows[0] || null;
}

/**
 * Edits every setting - only while registration is open (the WHERE
 * makes a start that lands first win; null comes back then).
 */
export async function updateEventSettings(
  eventId,
  { name, game, format, configuredCutSize, drawRule, maxPlayers, roundTimeLimitMinutes, registrationMode, vanguardRegion, vanguardRegulation, startsAt = null }
) {
  const { rows } = await pool.query(
    `UPDATE tournament_events
     SET name = $2, game = $3, format = $4, configured_cut_size = $5, draw_rule = $6,
         max_players = $7, round_time_limit_minutes = $8,
         registration_mode = $9, vanguard_region = $10, vanguard_regulation = $11,
         starts_at = COALESCE($12, starts_at)
     WHERE id = $1 AND status = 'registration'
     RETURNING *`,
    [eventId, name, game, format, configuredCutSize ?? null, drawRule, maxPlayers, roundTimeLimitMinutes ?? null,
      registrationMode, vanguardRegion, vanguardRegulation, startsAt]
  );
  return rows[0] || null;
}

/** Once rounds are running, only the name and round time limit change. */
export async function updateEventBasics(eventId, { name, roundTimeLimitMinutes }) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET name = $2, round_time_limit_minutes = $3
     WHERE id = $1 AND status IN ('swiss', 'bracket')
     RETURNING *`,
    [eventId, name, roundTimeLimitMinutes ?? null]
  );
  return rows[0] || null;
}

/** During check-in: the name, round time limit and start time (null keeps it). */
export async function updateEventCheckInBasics(eventId, { name, roundTimeLimitMinutes, startsAt = null }) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET name = $2, round_time_limit_minutes = $3, starts_at = COALESCE($4, starts_at)
     WHERE id = $1 AND status = 'check_in'
     RETURNING *`,
    [eventId, name, roundTimeLimitMinutes ?? null, startsAt]
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

export async function markPlayersHadBye(playerIds, db = pool) {
  if (playerIds.length === 0) return;
  await db.query(`UPDATE tournament_players SET had_bye = true WHERE id = ANY($1::uuid[])`, [playerIds]);
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
export async function insertRoundMatches(eventId, phase, roundNumber, pairings, db = pool) {
  const inserted = [];
  for (const { player1Id, player2Id, tableNumber = null, tableOnline = false } of pairings) {
    const isBye = !player2Id;
    const { rows } = await db.query(
      `INSERT INTO tournament_matches (event_id, phase, round_number, player1_id, player2_id, result, confirmed_at, table_number, table_online)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [eventId, phase, roundNumber, player1Id, player2Id ?? null, isBye ? "bye" : null, isBye ? new Date() : null, tableNumber, tableOnline]
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

// ---------- Event day: entry, waitlist, lottery (migration 020) ----------
// Each runs in one transaction with the event row locked, so two
// requests at once (two drops, a drop + a draw) can't double-promote or
// hand out the same waitlist position twice.


async function inEventTx(eventId, fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT * FROM tournament_events WHERE id = $1 FOR UPDATE`, [eventId]);
    const result = await fn(client, rows[0] || null);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Closes gaps in the queue (someone left / moved in): positions become 1..n in order. */
async function renumberWaitlist(client, eventId) {
  await client.query(
    `UPDATE tournament_players tp SET waitlist_position = q.pos
     FROM (
       SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position, registered_at) AS pos
       FROM tournament_players WHERE event_id = $1 AND dropped = false AND entry_status = 'waitlisted'
     ) q
     WHERE tp.id = q.id AND tp.waitlist_position IS DISTINCT FROM q.pos`,
    [eventId]
  );
}

async function nextWaitlistPosition(client, eventId) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(waitlist_position), 0) + 1 AS next FROM tournament_players WHERE event_id = $1 AND dropped = false`,
    [eventId]
  );
  return rows[0].next;
}

/**
 * Registers (or re-registers a dropped) player with the entry status the
 * event's mode + state give them. During check-in only the waitlist is
 * open. Throws ALREADY_REGISTERED like registerPlayer.
 */
export async function registerWithEntry(eventId, userId) {
  return inEventTx(eventId, async (client, event) => {
    const { rows: counts } = await client.query(
      `SELECT COUNT(*)::int AS entered FROM tournament_players WHERE event_id = $1 AND dropped = false AND entry_status = 'entered'`,
      [eventId]
    );
    const entryStatus =
      event.status === "check_in"
        ? "waitlisted"
        : entryStatusOnRegister({
            mode: event.registration_mode,
            maxPlayers: event.max_players,
            enteredCount: counts[0].entered,
            lotteryDrawn: !!event.lottery_drawn_at,
          });
    const waitlistPosition = entryStatus === "waitlisted" ? await nextWaitlistPosition(client, eventId) : null;
    const { rows } = await client.query(
      `INSERT INTO tournament_players (event_id, user_id, entry_status, waitlist_position)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (event_id, user_id) DO UPDATE
         SET dropped = false, registered_at = now(), entry_status = $3, waitlist_position = $4,
             check_in_requested_at = NULL, checked_in_at = NULL, checked_in_by = NULL, no_show = false
         WHERE tournament_players.dropped = true
       RETURNING *`,
      [eventId, userId, entryStatus, waitlistPosition]
    );
    if (rows[0]) return rows[0];
    const err = new Error("You're already registered for this event.");
    err.code = "ALREADY_REGISTERED";
    throw err;
  });
}

/**
 * Drops a player; before the first round, an entered player's spot goes
 * to the next waitlister. Returns { dropped, promoted } (promoted = the
 * promoted player row or null).
 */
export async function dropAndPromote(playerId) {
  const player = await getPlayerById(playerId);
  if (!player) return { dropped: null, promoted: null };
  return inEventTx(player.event_id, async (client, event) => {
    const { rows } = await client.query(
      `UPDATE tournament_players SET dropped = true WHERE id = $1 AND dropped = false RETURNING *`,
      [playerId]
    );
    const dropped = rows[0] || (await client.query(`SELECT * FROM tournament_players WHERE id = $1`, [playerId])).rows[0];
    let promoted = null;
    const preStart = event.status === "registration" || event.status === "check_in";
    if (rows[0] && preStart && rows[0].entry_status === "entered") {
      const { rows: waiting } = await client.query(
        `SELECT id, waitlist_position, dropped FROM tournament_players WHERE event_id = $1 AND entry_status = 'waitlisted'`,
        [event.id]
      );
      const nextId = nextFromWaitlist(waiting.map((w) => ({ id: w.id, waitlistPosition: w.waitlist_position, dropped: w.dropped })));
      if (nextId) {
        const { rows: up } = await client.query(
          `UPDATE tournament_players SET entry_status = 'entered', waitlist_position = NULL WHERE id = $1 RETURNING *`,
          [nextId]
        );
        promoted = up[0];
      }
    }
    if (rows[0]) await renumberWaitlist(client, event.id);
    return { dropped, promoted };
  });
}

/**
 * Runs the lottery once. Returns null if it already ran; otherwise
 * { entered: userIds, waitlisted: userIds } in drawn order.
 */
export async function runLottery(eventId, rng = Math.random) {
  return inEventTx(eventId, async (client, event) => {
    if (event.lottery_drawn_at) return null;
    const { rows: applicants } = await client.query(
      `SELECT id, user_id FROM tournament_players WHERE event_id = $1 AND dropped = false AND entry_status = 'pending_draw' ORDER BY registered_at`,
      [eventId]
    );
    const { entered, waitlisted } = drawLottery(applicants.map((a) => a.id), event.max_players, rng);
    await client.query(
      `UPDATE tournament_players SET entry_status = 'entered', waitlist_position = NULL WHERE id = ANY($1::uuid[])`,
      [entered]
    );
    for (let i = 0; i < waitlisted.length; i++) {
      await client.query(`UPDATE tournament_players SET entry_status = 'waitlisted', waitlist_position = $2 WHERE id = $1`, [
        waitlisted[i],
        i + 1,
      ]);
    }
    await client.query(`UPDATE tournament_events SET lottery_drawn_at = now() WHERE id = $1`, [eventId]);
    const userOf = new Map(applicants.map((a) => [a.id, a.user_id]));
    return { entered: entered.map((id) => userOf.get(id)), waitlisted: waitlisted.map((id) => userOf.get(id)) };
  });
}

/** Entered (spot-holding) non-dropped players - what max_players caps. */
export async function countEnteredPlayers(eventId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM tournament_players WHERE event_id = $1 AND dropped = false AND entry_status = 'entered'`,
    [eventId]
  );
  return rows[0].count;
}

// ---------- Event day: check-in ----------

/** registration -> check_in, once. null if the event wasn't in registration. */
export async function openCheckIn(eventId) {
  const { rows } = await pool.query(
    `UPDATE tournament_events SET status = 'check_in', check_in_opened_at = now()
     WHERE id = $1 AND status = 'registration' RETURNING *`,
    [eventId]
  );
  return rows[0] || null;
}

export async function requestCheckIn(playerId) {
  const { rows } = await pool.query(
    `UPDATE tournament_players SET check_in_requested_at = COALESCE(check_in_requested_at, now())
     WHERE id = $1 RETURNING *`,
    [playerId]
  );
  return rows[0] || null;
}

// Approvals take the event's lock and re-check it's still in check-in, so
// one that lands while Start is running waits for it and is then refused
// (instead of being recorded after Start already wrote that player off).

export async function approveCheckIn(playerId, approvedBy) {
  const player = await getPlayerById(playerId);
  if (!player) return null;
  return inEventTx(player.event_id, async (client, event) => {
    if (event.status !== "check_in") return null;
    const { rows } = await client.query(
      `UPDATE tournament_players SET checked_in_at = COALESCE(checked_in_at, now()), checked_in_by = COALESCE(checked_in_by, $2)
       WHERE id = $1 AND dropped = false RETURNING *`,
      [playerId, approvedBy]
    );
    return rows[0] || null;
  });
}

/** Approves every registered, non-dropped, not-yet-approved player among userIds. Returns how many (null = check-in closed). */
export async function approveCheckInForUsers(eventId, userIds, approvedBy) {
  return inEventTx(eventId, async (client, event) => {
    if (event.status !== "check_in") return null;
    if (userIds.length === 0) return 0;
    const { rowCount } = await client.query(
      `UPDATE tournament_players SET checked_in_at = now(), checked_in_by = $3
       WHERE event_id = $1 AND user_id = ANY($2::uuid[]) AND dropped = false AND checked_in_at IS NULL
         AND entry_status IN ('entered', 'waitlisted')`,
      [eventId, userIds, approvedBy]
    );
    return rowCount;
  });
}

/** At start: waitlisters filling no-show spots become entered; unapproved entrants are no-shows. */
export async function applyStartingRoster(eventId, { starterIds, noShowIds }) {
  await pool.query(
    `UPDATE tournament_players SET entry_status = 'entered', waitlist_position = NULL
     WHERE event_id = $1 AND id = ANY($2::uuid[]) AND entry_status = 'waitlisted'`,
    [eventId, starterIds]
  );
  await pool.query(`UPDATE tournament_players SET no_show = true WHERE event_id = $1 AND id = ANY($2::uuid[])`, [
    eventId,
    noShowIds,
  ]);
}

/**
 * After the limit goes up: waitlisters move in, in queue order, until the
 * event is full again. Returns the promoted rows. (A lottery that hasn't
 * been drawn has no waitlist yet - nothing to do.)
 */
export async function promoteWaitlistUpToLimit(eventId) {
  return inEventTx(eventId, async (client, event) => {
    if (!event.max_players || (event.registration_mode === "lottery" && !event.lottery_drawn_at)) return [];
    const { rows: counts } = await client.query(
      `SELECT COUNT(*)::int AS entered FROM tournament_players WHERE event_id = $1 AND dropped = false AND entry_status = 'entered'`,
      [eventId]
    );
    const free = event.max_players - counts[0].entered;
    if (free <= 0) return [];
    const { rows } = await client.query(
      `UPDATE tournament_players SET entry_status = 'entered', waitlist_position = NULL
       WHERE id IN (
         SELECT id FROM tournament_players
         WHERE event_id = $1 AND dropped = false AND entry_status = 'waitlisted'
         ORDER BY waitlist_position LIMIT $2
       ) RETURNING *`,
      [eventId, free]
    );
    await renumberWaitlist(client, eventId);
    return rows;
  });
}


/**
 * Start, all in one transaction with the event row locked (the same lock
 * drops take): re-read the players, let `plan(event, players)` decide
 * the roster + round 1, then flip the status, record no-shows/overflow
 * and write round 1. Returns null if the event wasn't in check-in,
 * { error } if plan refused, else { event, ...plan's result }.
 */
export async function startFromCheckIn(eventId, plan) {
  return inEventTx(eventId, async (client, event) => {
    if (!event || event.status !== "check_in") return null;
    const { rows: players } = await client.query(
      `SELECT tp.*, u.display_name FROM tournament_players tp JOIN users u ON u.id = tp.user_id
       WHERE tp.event_id = $1 ORDER BY tp.registered_at ASC`,
      [eventId]
    );
    const result = plan(event, players);
    if (result.error) return { error: result.error };
    const { rows } = await client.query(
      `UPDATE tournament_events
       SET status = 'swiss', current_phase = 'swiss', current_round = 1,
           round_count = $2, cut_enabled = $3, started_at = now()
       WHERE id = $1 RETURNING *`,
      [eventId, result.roundCount, result.cutEnabled]
    );
    const { starters, noShows } = result;
    // Waitlisters filling spots become entered; unapproved entrants are
    // no-shows; anyone still "entered" beyond the roster (settings changed
    // under them) goes back to the waitlist - they never pair.
    await client.query(
      `UPDATE tournament_players SET entry_status = 'entered', waitlist_position = NULL
       WHERE event_id = $1 AND id = ANY($2::uuid[]) AND entry_status = 'waitlisted'`,
      [eventId, starters]
    );
    await client.query(`UPDATE tournament_players SET no_show = true WHERE event_id = $1 AND id = ANY($2::uuid[])`, [eventId, noShows]);
    await client.query(
      `UPDATE tournament_players SET entry_status = 'waitlisted'
       WHERE event_id = $1 AND entry_status = 'entered' AND dropped = false AND no_show = false AND NOT (id = ANY($2::uuid[]))`,
      [eventId, starters]
    );
    await renumberWaitlist(client, eventId);
    await insertRoundMatches(eventId, "swiss", 1, result.pairings, client);
    if (result.byePlayerId) await markPlayersHadBye([result.byePlayerId], client);
    return { event: rows[0], ...result };
  });
}

// ---------- Lobby: upcoming events across shops ----------

const LIKE_SPECIALS = /[\\%_]/g;

/**
 * Open, check-in and live events at published shops (lobby-events §6.1).
 * An event never started more than 24h after its start time is treated
 * as abandoned. `window` = { from, to } or null; live events ignore it.
 */
export async function listUpcomingEvents({ q = null, game = null, window = null, userId, now = new Date() }) {
  const pattern = q ? `%${q.replace(LIKE_SPECIALS, (c) => `\\${c}`)}%` : null;
  const { rows } = await pool.query(
    `SELECT e.*,
            s.name AS shop_name, s.code AS shop_code, s.logo_url AS shop_logo_url,
            COALESCE(c.entered_count, 0)::int AS entered_count,
            me.entry_status AS my_entry_status, me.waitlist_position AS my_waitlist_position,
            me.dropped AS my_dropped, me.no_show AS my_no_show
     FROM tournament_events e
     JOIN shops s ON s.id = e.shop_id AND s.status = 'published'
     JOIN users owner ON owner.id = s.owner_user_id -- same shops as listPublishedShops (no ownerless default room)
     LEFT JOIN (
       SELECT event_id, COUNT(*) AS entered_count
       FROM tournament_players
       WHERE entry_status = 'entered' AND NOT dropped
       GROUP BY event_id
     ) c ON c.event_id = e.id
     LEFT JOIN tournament_players me ON me.event_id = e.id AND me.user_id = $1
     WHERE e.status IN ('registration', 'check_in', 'swiss', 'bracket')
       AND (e.status IN ('swiss', 'bracket') OR e.starts_at IS NULL OR e.starts_at > $2::timestamptz - interval '24 hours')
       AND ($3::text IS NULL OR s.name ILIKE $3 ESCAPE '\\' OR e.name ILIKE $3 ESCAPE '\\')
       AND ($4::text IS NULL OR e.game = $4)
       AND ($5::timestamptz IS NULL OR e.status IN ('swiss', 'bracket') OR (e.starts_at >= $5 AND e.starts_at < $6))
     ORDER BY (e.status IN ('swiss', 'bracket')) DESC, e.starts_at ASC NULLS LAST, e.created_at DESC
     LIMIT 50`,
    [userId, now, pattern, game, window?.from ?? null, window?.to ?? null]
  );
  return rows;
}
