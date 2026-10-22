// Judges, judge calls and penalties for events (migration 020).

import { pool } from "./pool.js";

export async function addJudge(eventId, userId, addedBy) {
  await pool.query(
    `INSERT INTO event_judges (event_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [eventId, userId, addedBy]
  );
}

export async function removeJudge(eventId, userId) {
  await pool.query(`DELETE FROM event_judges WHERE event_id = $1 AND user_id = $2`, [eventId, userId]);
}

export async function listJudges(eventId) {
  const { rows } = await pool.query(
    `SELECT j.user_id, u.display_name FROM event_judges j JOIN users u ON u.id = j.user_id
     WHERE j.event_id = $1 ORDER BY j.created_at`,
    [eventId]
  );
  return rows;
}

export async function isJudge(eventId, userId) {
  const { rows } = await pool.query(`SELECT 1 FROM event_judges WHERE event_id = $1 AND user_id = $2`, [eventId, userId]);
  return rows.length > 0;
}

/**
 * This user's latest call on a match, with its age in ms measured by the
 * database's own clock (`age_ms`) - the app server's clock can drift from
 * the DB's, which would make a cooldown never (or always) expire.
 */
export async function lastCallBy(matchId, userId) {
  const { rows } = await pool.query(
    `SELECT *, (EXTRACT(EPOCH FROM (now() - created_at)) * 1000)::float8 AS age_ms
     FROM judge_calls WHERE match_id = $1 AND called_by = $2 ORDER BY created_at DESC LIMIT 1`,
    [matchId, userId]
  );
  return rows[0] || null;
}

/**
 * Records a call unless this user called on this match within
 * `cooldownMs`. null = still cooling down. A single INSERT ... WHERE NOT
 * EXISTS isn't enough on its own: under READ COMMITTED two concurrent
 * statements can't see each other's uncommitted row, so both insert.
 * A transaction-scoped advisory lock per (match, caller) makes the
 * second click wait for the first to commit, then see its row.
 */
export async function createJudgeCall(eventId, matchId, userId, cooldownMs) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`judge-call:${matchId}:${userId}`]);
    const { rows } = await client.query(
      `INSERT INTO judge_calls (event_id, match_id, called_by)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM judge_calls
         WHERE match_id = $2 AND called_by = $3 AND created_at > now() - ($4::float8 * interval '1 millisecond')
       )
       RETURNING *`,
      [eventId, matchId, userId, cooldownMs]
    );
    await client.query("COMMIT");
    return rows[0] || null;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getJudgeCall(callId) {
  const { rows } = await pool.query(`SELECT * FROM judge_calls WHERE id = $1`, [callId]);
  return rows[0] || null;
}

/** open -> claimed, once. null if someone already took it. */
export async function claimJudgeCall(callId, userId) {
  const { rows } = await pool.query(
    `UPDATE judge_calls SET status = 'claimed', claimed_by = $2, claimed_at = now()
     WHERE id = $1 AND status = 'open' RETURNING *`,
    [callId, userId]
  );
  return rows[0] || null;
}

export async function resolveJudgeCall(callId) {
  const { rows } = await pool.query(
    `UPDATE judge_calls SET status = 'resolved', resolved_at = now() WHERE id = $1 AND status <> 'resolved' RETURNING *`,
    [callId]
  );
  return rows[0] || null;
}

/** Open + claimed calls with their table, oldest first. */
export async function listActiveJudgeCalls(eventId) {
  const { rows } = await pool.query(
    `SELECT c.*, m.table_number, m.table_online, u.display_name AS called_by_name, cu.display_name AS claimed_by_name
     FROM judge_calls c
     JOIN tournament_matches m ON m.id = c.match_id
     LEFT JOIN users u ON u.id = c.called_by
     LEFT JOIN users cu ON cu.id = c.claimed_by
     WHERE c.event_id = $1 AND c.status <> 'resolved'
     ORDER BY c.created_at`,
    [eventId]
  );
  return rows;
}

// ---------- Penalties ----------

export async function createPenalty({ eventId, playerId, matchId, level, reason, issuedBy, status }) {
  const { rows } = await pool.query(
    `INSERT INTO event_penalties (event_id, player_id, match_id, level, reason, issued_by, status, decided_by, decided_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 = 'confirmed' THEN $6::uuid END, CASE WHEN $7 = 'confirmed' THEN now() END)
     RETURNING *`,
    [eventId, playerId, matchId ?? null, level, reason, issuedBy, status]
  );
  return rows[0];
}

export async function getPenalty(id) {
  const { rows } = await pool.query(`SELECT * FROM event_penalties WHERE id = $1`, [id]);
  return rows[0] || null;
}

/** pending -> confirmed/rejected, once. null if already decided. */
export async function decidePenalty(id, status, decidedBy) {
  const { rows } = await pool.query(
    `UPDATE event_penalties SET status = $2, decided_by = $3, decided_at = now()
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [id, status, decidedBy]
  );
  return rows[0] || null;
}

/** All of an event's penalties, or only one player's (playerId). */
export async function listPenalties(eventId, playerId = null) {
  const { rows } = await pool.query(
    `SELECT p.*, u.display_name AS player_name, iu.display_name AS issued_by_name
     FROM event_penalties p
     JOIN tournament_players tp ON tp.id = p.player_id
     JOIN users u ON u.id = tp.user_id
     LEFT JOIN users iu ON iu.id = p.issued_by
     WHERE p.event_id = $1 AND ($2::uuid IS NULL OR p.player_id = $2)
     ORDER BY p.created_at`,
    [eventId, playerId]
  );
  return rows;
}
