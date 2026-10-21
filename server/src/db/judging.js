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

export async function lastCallBy(matchId, userId) {
  const { rows } = await pool.query(
    `SELECT * FROM judge_calls WHERE match_id = $1 AND called_by = $2 ORDER BY created_at DESC LIMIT 1`,
    [matchId, userId]
  );
  return rows[0] || null;
}

export async function createJudgeCall(eventId, matchId, userId) {
  const { rows } = await pool.query(
    `INSERT INTO judge_calls (event_id, match_id, called_by) VALUES ($1, $2, $3) RETURNING *`,
    [eventId, matchId, userId]
  );
  return rows[0];
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
