// Pure Swiss-tournament logic: round-count formula, pairing, points,
// and the OPW tiebreaker. No DB/IO in here on purpose - routes/
// tournaments.js maps Postgres rows into the plain shapes below and
// back, so this module can be unit-tested (and reasoned about) on its
// own. See the project doc's "Planned: tournament/event system" for
// the design rationale behind every rule encoded here.

/**
 * Swiss round count: ceil(log2(N)), minimum 3 regardless of what the
 * formula gives for a small field.
 */
export function computeRoundCount(playerCount) {
  if (playerCount < 2) return 3;
  return Math.max(3, Math.ceil(Math.log2(playerCount)));
}

/**
 * A player as this module sees it: { id, points, opponentIds, hadBye, dropped }
 * - opponentIds: every real opponent faced so far (byes excluded), used
 *   for rematch avoidance only - NOT the same list used for OPW (that's
 *   computed separately from match history, see computeOpw below).
 */

/**
 * Builds the next round's pairings.
 *
 * Standard Swiss: group by matching points, pair within a group, avoid
 * a rematch if an alternative exists. Implemented as a simple greedy
 * pass over the points-sorted field - take the top remaining player,
 * pair them with the highest-remaining opponent they haven't already
 * played. When everyone left in their own bracket is a repeat, this
 * naturally looks further down the list (i.e. "pulls down" from the
 * next bracket) rather than forcing a rematch, which is exactly the
 * standard behavior for the case that matters in practice; a true
 * forced rematch is only used as an absolute last resort (nobody left
 * to pair with that hasn't already been played).
 *
 * @param {Array} players - active (non-dropped) players
 * @param {() => number} [rng] - injectable for deterministic tests; defaults to Math.random
 * @returns {{ pairings: Array<{player1Id: string, player2Id: string|null}>, byePlayerId: string|null }}
 */
export function pairRound(players, rng = Math.random) {
  if (players.length === 0) return { pairings: [], byePlayerId: null };

  // Sort by points descending; shuffle within equal-points groups so
  // pairing order isn't the same every round for players tied on points.
  const sorted = shuffleGroupedByPoints(players, rng);

  let byePlayerId = null;
  let working = sorted;
  if (working.length % 2 === 1) {
    // Bye goes to the lowest-ranked player who hasn't had one yet; if
    // everyone remaining has already had a bye (only possible deep into
    // an event with lots of drops), fall back to the lowest-ranked
    // player overall.
    let byeIndex = -1;
    for (let i = working.length - 1; i >= 0; i--) {
      if (!working[i].hadBye) {
        byeIndex = i;
        break;
      }
    }
    if (byeIndex === -1) byeIndex = working.length - 1;
    byePlayerId = working[byeIndex].id;
    working = working.slice(0, byeIndex).concat(working.slice(byeIndex + 1));
  }

  const pairings = [];
  const pool = [...working];
  while (pool.length > 0) {
    const p1 = pool.shift();
    const played = new Set(p1.opponentIds);
    let opponentIndex = pool.findIndex((p) => !played.has(p.id));
    if (opponentIndex === -1) opponentIndex = 0; // forced rematch, last resort
    const [p2] = pool.splice(opponentIndex, 1);
    pairings.push({ player1Id: p1.id, player2Id: p2.id });
  }

  if (byePlayerId) pairings.push({ player1Id: byePlayerId, player2Id: null });
  return { pairings, byePlayerId };
}

function shuffleGroupedByPoints(players, rng) {
  const byPoints = new Map();
  for (const p of players) {
    if (!byPoints.has(p.points)) byPoints.set(p.points, []);
    byPoints.get(p.points).push(p);
  }
  const pointGroups = [...byPoints.keys()].sort((a, b) => b - a);
  const out = [];
  for (const points of pointGroups) {
    out.push(...shuffle(byPoints.get(points), rng));
  }
  return out;
}

function shuffle(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** win=3, loss=0, draw/double-loss per the event's draw_rule. */
export function pointsForResult(result, perspective, drawRule) {
  // perspective: 'player1' | 'player2'
  if (result === "bye") return 3; // a bye counts as a win for standings purposes
  if (result === "double_loss") return 0;
  if (result === "draw") return drawRule === "draw" ? 1 : 0;
  const won = (perspective === "player1" && result === "player1_win") ||
    (perspective === "player2" && result === "player2_win");
  return won ? 3 : 0;
}

/**
 * Opponents' match-win percentage, with a 33% floor per opponent so one
 * opponent who went 0-N doesn't crater this player's OPW unrealistically.
 *
 * @param {string} playerId
 * @param {Array<{player1Id, player2Id, result}>} matches - finalized Swiss matches only
 * @param {Map<string, {wins:number, losses:number, draws:number}>} recordByPlayerId
 */
export function computeOpw(playerId, matches, recordByPlayerId) {
  const opponentIds = [];
  for (const m of matches) {
    if (m.result === "bye" || !m.player2Id) continue;
    if (m.player1Id === playerId) opponentIds.push(m.player2Id);
    else if (m.player2Id === playerId) opponentIds.push(m.player1Id);
  }
  if (opponentIds.length === 0) return 0;

  const FLOOR = 1 / 3;
  const total = opponentIds.reduce((sum, oppId) => {
    const rec = recordByPlayerId.get(oppId);
    const played = rec ? rec.wins + rec.losses + rec.draws : 0;
    const wp = played > 0 ? rec.wins / played : 0;
    return sum + Math.max(wp, FLOOR);
  }, 0);
  return total / opponentIds.length;
}

/**
 * Final tiebreaker order: match points -> OPW -> random. Mutates
 * nothing; returns a new sorted array. Random ties are broken once,
 * right here, using `rng` (inject a seeded one for a reproducible
 * result if ever needed - defaults to a real coin flip).
 *
 * @param {Array<{id, points, opw}>} standings
 */
export function sortStandings(standings, rng = Math.random) {
  // Attach a one-time random tiebreak value so equal (points, opw)
  // pairs get a stable-for-this-call order instead of whatever order
  // they happened to arrive in.
  const withTiebreak = standings.map((s) => ({ ...s, _coinFlip: rng() }));
  withTiebreak.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.opw !== a.opw) return b.opw - a.opw;
    return b._coinFlip - a._coinFlip;
  });
  return withTiebreak.map(({ _coinFlip, ...rest }) => rest);
}
