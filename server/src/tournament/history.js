// A player's own match history (match-history design §5-§7): turns the
// raw rows of one finished event into what the history screen shows -
// each match from the player's own seat, their record, where they left
// and which penalties they got. Pure, so the rules are unit-tested.

const SHOWN_PENALTY_STATUSES = new Set(["recorded", "confirmed"]);

/** The match result as `myPlayerId` sees it: win/loss/draw/double_loss/bye, or null if unresolved. */
export function resultForPlayer(match, myPlayerId) {
  const { result } = match;
  if (result === "player1_win") return match.player1Id === myPlayerId ? "win" : "loss";
  if (result === "player2_win") return match.player2Id === myPlayerId ? "win" : "loss";
  return result ?? null; // draw, double_loss, bye
}

/** "Top 8", "Semifinal", "Final" - by how many players a bracket round starts with. */
export function bracketRoundLabel(cutSize, round) {
  const left = cutSize / 2 ** (round - 1);
  if (left === 2) return "Final";
  if (left === 4) return "Semifinal";
  return `Top ${left}`;
}

const PHASE_ORDER = { swiss: 0, bracket: 1 };

/**
 * One history entry for one event. `me` is the player's own
 * tournament_players row, `matches` every match they were in (with
 * `opponent_name` and `opponent_player_id`, null for a bye), `penalties`
 * their own penalties, `opponentDecks` opponent player id -> { g3 }.
 */
export function buildHistoryEntry({ event, me, matches, penalties, playedCount, opponentDecks = new Map() }) {
  const shown = penalties.filter((p) => SHOWN_PENALTY_STATUSES.has(p.status));
  const brief = (p) => ({ level: p.level, reason: p.reason });

  const ordered = [...matches].sort(
    (a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || a.round_number - b.round_number
  );
  const record = { wins: 0, losses: 0, draws: 0 };
  const entryMatches = ordered.map((m) => {
    const result = resultForPlayer({ player1Id: m.player1_id, player2Id: m.player2_id, result: m.result }, me.id);
    if (result === "win" || result === "bye") record.wins++;
    else if (result === "loss" || result === "double_loss") record.losses++;
    else if (result === "draw") record.draws++;
    return {
      phase: m.phase,
      round: m.round_number,
      roundLabel: m.phase === "swiss" ? `Round ${m.round_number}` : bracketRoundLabel(event.effective_cut_size, m.round_number),
      opponentName: m.player2_id === null ? "Bye" : m.opponent_name,
      result,
      // The opponent's G3 ride line, when they submitted a deck (part 4).
      opponentDeck: (m.opponent_player_id && opponentDecks.get(m.opponent_player_id)) || null,
      penalties: shown.filter((p) => p.match_id === m.id).map(brief),
    };
  });

  const ranked = me.final_rank != null || me.final_label != null;
  const swissRounds = ordered.filter((m) => m.phase === "swiss").map((m) => m.round_number);
  const dropRound = !ranked && me.dropped && swissRounds.length ? Math.max(...swissRounds) : null;

  return {
    eventId: event.id,
    name: event.name,
    game: event.game,
    vanguardRegion: event.vanguard_region ?? null,
    vanguardRegulation: event.vanguard_regulation ?? null,
    shopName: event.shop_name,
    shopCode: event.shop_code,
    date: event.starts_at ?? event.started_at,
    players: playedCount,
    finalRank: me.final_rank ?? null,
    finalLabel: me.final_label ?? null,
    dropped: me.dropped,
    dropRound,
    disqualified: shown.some((p) => p.level === "disqualification" && p.status === "confirmed"),
    record,
    matches: entryMatches,
    otherPenalties: shown.filter((p) => p.match_id == null).map(brief),
  };
}
