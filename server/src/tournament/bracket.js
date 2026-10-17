// Pure top-cut bracket logic: the 1.5x minimum-players threshold, the
// 0/1-loss guarantee with overflow/underflow handling, randomized
// single-elimination pairing/advancement, and final placement labels.
// No DB/IO here, same reasoning as swiss.js - see the project doc's
// "Planned: tournament/event system" for the design rationale.

const VALID_CUT_SIZES = [4, 8, 16, 32, 64];

export function isValidCutSize(n) {
  return VALID_CUT_SIZES.includes(n);
}

/** Largest power of 2 that does not exceed n (n >= 1). */
export function largestPowerOfTwoAtMost(n) {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

/** Smallest power of 2 that is >= n (n >= 1). */
export function nextPowerOfTwoAtLeast(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * The minimum-players gate, checked once at event start against the
 * cut size the organizer configured. Inclusive boundary - exactly 1.5x
 * passes.
 */
export function meetsMinimumPlayersThreshold(totalPlayers, configuredCutSize) {
  return totalPlayers >= configuredCutSize * 1.5;
}

export function thresholdMessage(totalPlayers, configuredCutSize) {
  const minRequired = configuredCutSize * 1.5;
  return (
    `จำนวนผู้เล่นที่ลงทะเบียน (${totalPlayers} คน) ไม่ถึงเกณฑ์ขั้นต่ำสำหรับ Top Cut ` +
    `ขนาด ${configuredCutSize} คน (ต้องมีผู้เล่นอย่างน้อย 1.5 เท่าของ cut size คือ ${minRequired} คน) ` +
    `ระบบจะจัดการแข่งขันนี้แบบ Swiss ทั้งหมด (ไม่มีรอบ knockout) แทน`
  );
}

/**
 * Decides whether the cut is enabled at all for this event. Call once,
 * right when the event is started (registration closes) - the result
 * (`cutEnabled`, and the organizer-configured cut size itself) is
 * persisted on the event row and never re-checked later, even if the
 * overflow rule in resolveCutRoster() below ends up expanding the
 * actual bracket size past what was configured.
 */
export function resolveCutEligibility(format, totalPlayers, configuredCutSize) {
  if (format !== "swiss_cut" || !configuredCutSize) {
    return { cutEnabled: false, reason: null };
  }
  if (!meetsMinimumPlayersThreshold(totalPlayers, configuredCutSize)) {
    return { cutEnabled: false, reason: thresholdMessage(totalPlayers, configuredCutSize) };
  }
  return { cutEnabled: true, reason: null };
}

/**
 * Picks exactly who enters the bracket, once Swiss is done. Handles all
 * three cases from the spec:
 *  - underflow (guaranteed group smaller than the cut): fill the rest
 *    from the next-best standings
 *  - exact fit: cut size as configured
 *  - overflow (guaranteed group bigger than the cut): expand to the
 *    next power of 2 that covers everyone guaranteed, capped at the
 *    largest power of 2 that doesn't exceed the total field, and fill
 *    any slots the guaranteed group leaves empty from the next-best
 *    standings (5 guaranteed -> top 8 = those 5 + the next 3); if the
 *    guaranteed group itself still exceeds that cap (very rare), trim
 *    the guaranteed group down to the cap using the standings order
 *    (which already reflects points -> OPW -> coin-flip)
 *
 * `qualified` comes back in standings order (best first) - the seeding
 * generateBracketRound1() uses for byes. It can still be shorter than
 * `cutSize` when drops left too few active players to fill the bracket.
 *
 * @param {Array} standings - sorted by sortStandings() in swiss.js
 *   (points -> OPW -> coin-flip), each item needs at least {id, losses}
 * @param {number} configuredCutSize
 * @param {number} totalPlayers - all registered players in the event
 *   (dropped or not - a dropped player can't be cut to, but is still
 *   part of the field size the 1.5x/overflow-cap math was based on;
 *   callers should pass standings with dropped players already removed
 *   and totalPlayers as the original registration count)
 */
export function resolveCutRoster(standings, configuredCutSize, totalPlayers) {
  const guaranteed = standings.filter((p) => p.losses <= 1);
  const nonGuaranteed = standings.filter((p) => p.losses > 1);

  if (guaranteed.length <= configuredCutSize) {
    // Underflow or exact fit - the normal case.
    const remainingSlots = configuredCutSize - guaranteed.length;
    const fill = nonGuaranteed.slice(0, remainingSlots);
    return {
      cutSize: configuredCutSize,
      qualified: [...guaranteed, ...fill],
      expanded: false,
      guaranteedTrimmed: false,
    };
  }

  // Overflow: expand to cover everyone guaranteed, capped at the field size.
  const desired = nextPowerOfTwoAtLeast(guaranteed.length);
  const cap = largestPowerOfTwoAtMost(totalPlayers);

  if (desired <= cap) {
    return {
      cutSize: desired,
      qualified: [...guaranteed, ...nonGuaranteed.slice(0, desired - guaranteed.length)],
      expanded: true,
      guaranteedTrimmed: false,
    };
  }

  // Even the field-size cap can't fit everyone guaranteed - the one
  // documented exception where a 0/1-loss player can still miss the
  // cut, trimmed by the normal tiebreaker order.
  return {
    cutSize: cap,
    qualified: guaranteed.slice(0, cap),
    expanded: true,
    guaranteedTrimmed: true,
  };
}

/**
 * Round-1 bracket pairings: fully randomized, no seeding by standing -
 * except when there are fewer players than slots (drops emptied some),
 * where the top-ranked players get the byes. Always cutSize / 2 entries,
 * so the bracket keeps its shape round to round; bye entries have
 * player2Id null and are spread out (every other slot) so two bye
 * holders don't meet in round 2 when that can be avoided.
 *
 * @param {string[]} qualifiedPlayerIds - standings order, best first
 * @param {number} [cutSize] - bracket size; defaults to the player count
 */
export function generateBracketRound1(qualifiedPlayerIds, cutSize = qualifiedPlayerIds.length, rng = Math.random) {
  const byeCount = Math.min(Math.max(cutSize - qualifiedPlayerIds.length, 0), qualifiedPlayerIds.length);
  const byes = qualifiedPlayerIds.slice(0, byeCount).map((id) => ({ player1Id: id, player2Id: null }));

  const shuffled = qualifiedPlayerIds.slice(byeCount);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({ player1Id: shuffled[i], player2Id: shuffled[i + 1] ?? null });
  }

  // Interleave: bye, match, bye, match, ... then whatever's left.
  const pairings = [];
  while (byes.length || matches.length) {
    if (byes.length) pairings.push(byes.shift());
    if (matches.length) pairings.push(matches.shift());
  }
  return pairings;
}

/**
 * Winners of the previous bracket round, in bracket order, paired up
 * for the next round (match i and i+1's winners meet next). Bracket
 * matches need a decisive winner - no draws/double-losses - so this
 * expects every match's result to be 'player1_win', 'player2_win', or
 * 'bye' (player 1 advances; see generateBracketRound1).
 */
export function advanceBracketRound(previousRoundMatchesInOrder) {
  const winners = previousRoundMatchesInOrder.map((m) => {
    if (m.result === "player1_win" || m.result === "bye") return m.player1Id;
    if (m.result === "player2_win") return m.player2Id;
    throw new Error(`Bracket match ${m.id ?? ""} needs a decisive winner, got "${m.result}"`);
  });
  const pairings = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairings.push({ player1Id: winners[i], player2Id: winners[i + 1] });
  }
  return pairings;
}

export function totalBracketRounds(cutSize) {
  return Math.log2(cutSize);
}

/**
 * Placement label for a player eliminated in (or winning) a given
 * bracket round. roundNumber is 1-based from the first bracket round;
 * `won` is true only for the winner of the final round.
 */
export function placementLabel(cutSize, roundNumber, won) {
  const rounds = totalBracketRounds(cutSize);
  if (roundNumber === rounds) return won ? "champion" : "runner_up";
  // Losing in round r (out of `rounds` total) means you were one of
  // `cutSize / 2^(r-1)` players alive going into that round, half of
  // whom lose it - i.e. everyone eliminated in round r shares the
  // "reached the top (cutSize / 2^r * 2)" label. E.g. cutSize=8: round 1
  // losers (4 of them) -> top8 reached... wait, round-1 losers in an 8-
  // cut are eliminated immediately, meaning they only reached the top 8
  // - label "top8". Round-2 (semifinal) losers reached "top4".
  const survivorsEnteringThisRound = cutSize / Math.pow(2, roundNumber - 1);
  return `top${survivorsEnteringThisRound}`;
}
